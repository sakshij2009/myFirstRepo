import React, { useState } from "react";
import { addDoc, collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const GREEN = "#1f6f43";

const ASSESSMENT_STEPS = [
  { id: 1, label: "Reason for Referral" },
  { id: 2, label: "Custody & Services" },
  { id: 3, label: "Consent" },
];

const CUSTODY_ARRANGEMENTS = [
  "Sole Custody",
  "Shared Custody",
  "Court-Ordered Visitation",
  "Informal Arrangement",
  "Other",
];

const SERVICE_OPTIONS = [
  "Transportation assistance",
  "Respite care",
  "Supervised visits",
  "Supervised Exchanges",
];

const emptyForm = () => ({
  reasonForReferral: "",
  presentingNeeds: "",
  currentCustodyArrangement: "",
  anticipatedServices: [],
  consentForServices: false,
  consentSignature: "",
  consentDate: "",
});

const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Textarea = ({ label, required, ...props }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <textarea
      rows={4}
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 resize-none"
    />
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
  <div className="flex items-center justify-center mb-8">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        <div className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              index + 1 <= currentStep
                ? "bg-green-700 text-white"
                : index + 1 === currentStep
                ? "bg-green-700 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {index + 1 < currentStep ? <Check size={14} strokeWidth={3} /> : step.id}
          </div>
          <span className={`text-xs mt-1 ${index + 1 <= currentStep ? "text-green-700 font-semibold" : "text-gray-500"}`}>
            {step.label}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div
            className={`h-0.5 w-16 mx-2 ${
              index + 1 < currentStep ? "bg-green-700" : "bg-gray-200"
            }`}
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

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleService = (service) => {
    const curr = form.anticipatedServices;
    set(
      "anticipatedServices",
      curr.includes(service) ? curr.filter((s) => s !== service) : [...curr, service]
    );
  };

  const validate = () => {
    const errs = {};
    if (step === 1) {
      if (!form.reasonForReferral.trim()) errs.reasonForReferral = "Required";
      if (!form.presentingNeeds.trim()) errs.presentingNeeds = "Required";
    }
    if (step === 2) {
      if (!form.currentCustodyArrangement) errs.currentCustodyArrangement = "Required";
      if (form.anticipatedServices.length === 0) errs.anticipatedServices = "Select at least one service";
    }
    if (step === 3) {
      if (!form.consentForServices) errs.consentForServices = "You must acknowledge to continue";
      if (!form.consentSignature.trim()) errs.consentSignature = "Signature is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => s + 1);
  };

  const handlePrev = () => setStep((s) => s - 1);

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

        reasonForReferral: form.reasonForReferral,
        presentingNeeds: form.presentingNeeds,
        currentCustodyArrangement: form.currentCustodyArrangement,
        anticipatedServices: form.anticipatedServices,
        consentForServices: form.consentForServices,
        consentSignature: form.consentSignature,
        consentDate: form.consentDate || new Date().toLocaleDateString("en-CA"),
      };

      let newAssessmentId = existingAssessmentId;

      if (existingAssessmentId) {
        await updateDoc(doc(db, "InTakeForms", existingAssessmentId), payload);
        newAssessmentId = existingAssessmentId;
      } else {
        const docRef = await addDoc(collection(db, "InTakeForms"), payload);
        newAssessmentId = docRef.id;
      }

      // Store assessmentId in user's intakeUsers record
      if (user?.id) {
        await updateDoc(doc(db, "intakeUsers", user.id), {
          assessmentId: newAssessmentId,
        });
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        navigate("/intake-form/private-form");
      }
    } catch (err) {
      console.error("Assessment submit error:", err);
      alert("Failed to submit: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-12 px-4"
      style={{ background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border p-8">
        {/* Header */}
        <div className="text-center mb-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "#F0FFF4" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F6F43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
            Pre-Intake Assessment
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280" }}>
            Please complete this brief assessment before starting your intake form.
          </p>
        </div>

        <ProgressBar current={step} total={ASSESSMENT_STEPS.length} />
        <Stepper steps={ASSESSMENT_STEPS} currentStep={step} />

        {/* Step 1: Reason for Referral */}
        {step === 1 && (
          <div>
            <Textarea
              label="Reason for Referral"
              required
              value={form.reasonForReferral}
              onChange={(e) => set("reasonForReferral", e.target.value)}
              placeholder="Please describe why you are seeking our services..."
              error={errors.reasonForReferral}
            />
            {errors.reasonForReferral && (
              <p className="text-red-500 text-xs mb-3 -mt-2">{errors.reasonForReferral}</p>
            )}

            <Textarea
              label="Presenting Needs"
              required
              value={form.presentingNeeds}
              onChange={(e) => set("presentingNeeds", e.target.value)}
              placeholder="Describe the current situation and needs of your family..."
              error={errors.presentingNeeds}
            />
            {errors.presentingNeeds && (
              <p className="text-red-500 text-xs mb-3 -mt-2">{errors.presentingNeeds}</p>
            )}
          </div>
        )}

        {/* Step 2: Custody & Services */}
        {step === 2 && (
          <div>
            <div className="mb-4">
              <Label required>Current Custody Arrangement</Label>
              <div className="flex flex-col gap-2 mt-2">
                {CUSTODY_ARRANGEMENTS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.currentCustodyArrangement === opt
                        ? "border-green-700 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt}
                      checked={form.currentCustodyArrangement === opt}
                      onChange={() => set("currentCustodyArrangement", opt)}
                      className="w-4 h-4 text-green-700 focus:ring-green-700"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.currentCustodyArrangement && (
                <p className="text-red-500 text-xs mt-1">{errors.currentCustodyArrangement}</p>
              )}
            </div>

            <div className="mb-4">
              <Label required>Services You Are Seeking</Label>
              <div className="flex flex-col gap-2 mt-2">
                {SERVICE_OPTIONS.map((svc) => (
                  <label
                    key={svc}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.anticipatedServices.includes(svc)
                        ? "border-green-700 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.anticipatedServices.includes(svc)}
                      onChange={() => toggleService(svc)}
                      className="w-4 h-4 text-green-700 rounded border-gray-400 focus:ring-green-700"
                    />
                    {svc}
                  </label>
                ))}
              </div>
              {errors.anticipatedServices && (
                <p className="text-red-500 text-xs mt-1">{errors.anticipatedServices}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Consent */}
        {step === 3 && (
          <div>
            <div
              className="p-4 rounded-lg bg-gray-50 border mb-4"
              style={{ borderColor: "#E5E7EB" }}
            >
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Consent for Services</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                I understand that the information provided in this assessment will be reviewed by a social worker
                to determine eligibility for services. I consent to having my family information shared with the
                relevant service providers as needed to facilitate care.
              </p>
            </div>

            <Checkbox
              label="I acknowledge that I have read and understand the above consent statement."
              checked={form.consentForServices}
              onChange={(v) => set("consentForServices", v)}
            />
            {errors.consentForServices && (
              <p className="text-red-500 text-xs mb-3">{errors.consentForServices}</p>
            )}

            <div className="mb-4">
              <Label required>Electronic Signature (Type your full name)</Label>
              <input
                type="text"
                value={form.consentSignature}
                onChange={(e) => set("consentSignature", e.target.value)}
                placeholder="Type your full name as signature"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
              {errors.consentSignature && (
                <p className="text-red-500 text-xs mt-1">{errors.consentSignature}</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: "#E5E7EB" }}>
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              step === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {step < ASSESSMENT_STEPS.length ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: GREEN }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#166534")}
              onMouseLeave={(e) => (e.currentTarget.style.background = GREEN)}
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
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