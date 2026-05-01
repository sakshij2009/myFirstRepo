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
  { id: 1,  label: "Welcome & Privacy" },
  { id: 2,  label: "Part A: Case Information" },
  { id: 3,  label: "Part B/C: Confidential Profile" },
  { id: 4,  label: "Part D: Payment Model" },
  { id: 5,  label: "Reports & Documentation" },
  { id: 6,  label: "Protocols & Confidentiality" },
  { id: 7,  label: "Sign & Complete" },
];

const REFERRAL_SOURCES = ["Self-referral","CFS / Child & Family Services","School","Healthcare Provider","Court Order","Legal Aid","Community Organization","Other"];
const RELATIONSHIPS = ["Mother","Father","Grandmother","Grandfather","Aunt","Uncle","Legal Guardian","Foster Parent","Other"];
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
    <div className="flex items-start gap-3 mb-4">
      {num && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: GREEN }}>
          {num}
        </div>
      )}
      <div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{subtitle}</p>}
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
    
    // Part B/C: Party Confidential Profile (Dynamic)
    fullName: "",
    address: "",
    phone: "",
    email: user?.email || "",
    relationship: "",
    relationshipOther: "",
    emergencyContact: emptyEmergency(),
    
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

      const partyData = {
        fullName: form.fullName,
        address: form.address,
        phone: form.phone,
        email: form.email,
        relationship: form.relationship,
        relationshipOther: form.relationshipOther,
        emergencyContact: form.emergencyContact,
        signature: form.signatureDataUrl,
        signedAt: serverTimestamp(),
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
          <SectionCard title="SECTION – PARTY INFORMATION & CONFIDENTIALITY">
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-lg mb-6">
               <p className="text-sm text-emerald-800 leading-relaxed">
                This intake is maintained as one case file for the purpose of service coordination, scheduling, safety planning, and documentation. 
                Each party shall complete only their own section. Personal contact information provided by one party will not be disclosed 
                to the other party unless required by law, court order, or written consent.
               </p>
            </div>
            <div className="space-y-4">
               <div className="flex items-start gap-3">
                  <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Your Privacy is Protected</h4>
                    <p className="text-xs text-gray-500 mt-1">Your personal contact details like address, phone, and email stay hidden from the other party.</p>
                  </div>
               </div>
               <div className="flex items-start gap-3">
                  <FileText className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Unified Case Management</h4>
                    <p className="text-xs text-gray-500 mt-1">We maintain one file for the family to ensure seamless scheduling and safety coordination.</p>
                  </div>
               </div>
            </div>
          </SectionCard>
          <SectionCard num={1} title="Initial Application Info">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Date of Application" type="date" value={form.applicationDate} onChange={e => set("applicationDate", e.target.value)} />
                <Input label="File Number (Internal)" placeholder="e.g. FF-2024-001" value={form.fileNumber} onChange={e => set("fileNumber", e.target.value)} />
                <Select
                  label="Referral Source"
                  options={REFERRAL_SOURCES}
                  value={form.referralSource}
                  onChange={v => set("referralSource", v)}
                />
              </div>
              {form.referralSource === "Other" && (
                <Input label="Specify Referral Source" value={form.referralSourceOther} onChange={e => set("referralSourceOther", e.target.value)} />
              )}
          </SectionCard>
        </div>
      );

      case 2: return (
        <div className="space-y-6">
          <SectionCard num={2} title="Part A – Case Information" subtitle="This section is shared internal case information used by Family Forever Inc.">
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Users size={16} /> Child(ren) Information
              </h4>
              {form.children.map((child, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Child #{i+1}</span>
                    {form.children.length > 1 && <button onClick={() => removeChild(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Input label="Full Legal Name" required value={child.fullName} onChange={e => updateChild(i, "fullName", e.target.value)} />
                    <Input label="Date of Birth" type="date" required value={child.dob} onChange={e => updateChild(i, "dob", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Gender" options={GENDERS} value={child.gender} onChange={v => updateChild(i, "gender", v)} />
                    <Select label="Custody Status" options={CUSTODY_OPTIONS} value={child.custody} onChange={v => updateChild(i, "custody", v)} />
                  </div>
                </div>
              ))}
              <button onClick={addChild} className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"><Plus size={14}/> Add Another Child</button>
              {errors.child0 && <p className="text-red-500 text-xs mt-2">{errors.child0}</p>}
            </div>

            <div className="space-y-4">
              <Radio label="Court Order Status" options={["Yes", "No", "Pending"]} value={form.courtOrder} onChange={v => set("courtOrder", v)} />
              {form.courtOrder === "Yes" && (
                <FileUpload label="Upload Court Order" fileRef={courtOrderFileRef} file={form.courtOrderFile} onChange={f => set("courtOrderFile", f)} />
              )}
              <Radio label="Child Welfare Involvement?" options={["Yes", "No"]} value={form.childWelfareInvolvement} onChange={v => set("childWelfareInvolvement", v)} />
              <Input label="Visit Type (e.g. Supervised, Exchange)" value={form.visitType} onChange={e => set("visitType", e.target.value)} />
              <Textarea label="Visit Goals" placeholder="What are your goals for these visits?" value={form.visitGoals} onChange={e => set("visitGoals", e.target.value)} />
              <Textarea label="Scheduling Preferences" placeholder="Days/times that work best for visits..." value={form.schedulingPreferences} onChange={e => set("schedulingPreferences", e.target.value)} />
              <Textarea label="Approved Visitors" placeholder="Names of individuals approved to participate..." value={form.approvedVisitors} onChange={e => set("approvedVisitors", e.target.value)} />
              <Textarea label="Shared Safety Concerns" placeholder="Non-confidential safety details relevant to visitation..." value={form.safetyConcerns} onChange={e => set("safetyConcerns", e.target.value)} />
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
    <div className="min-h-screen bg-[#FDFEFE] font-sans text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
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
          
          <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
             {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center shrink-0">
                   <div 
                    onClick={() => (completedSteps.includes(s.id) || s.id < step) && setStep(s.id)}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${s.id === step ? "opacity-100" : "opacity-40"}`}
                   >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.id === step ? "bg-emerald-600 text-white" : completedSteps.includes(s.id) ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {completedSteps.includes(s.id) ? <Check size={14} /> : s.id}
                      </div>
                   </div>
                   {i < STEPS.length - 1 && <div className="w-8 h-[2px] bg-gray-100 mx-1" />}
                </div>
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
