import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { db, storage } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  Check,
  Shield,
  Search,
  Users,
  Trash2,
  UserPlus,
  Pencil,
  Sun,
  Moon,
  CloudMoon,
  CalendarDays,
  Info,
  AlertTriangle,
  BarChart3,
  Flame,
  Pill,
  Sparkles,
  ShieldCheck,
  Heart,
  FileSearch,
  ChevronDown,
  Package,
  Briefcase,
  RotateCcw,
  Plus,
  Bed,
  Bath,
  Utensils,
  Wrench,
  ShieldAlert,
  Minus,
  Droplets,
  Apple,
  Lock
} from "lucide-react";

const MOCK_STAFF = [
  { id: 1, name: "Sarah Mitchell", role: "Senior Caregiver", experience: "4 yrs experience", initials: "SM", color: "#fce7f3" },
  { id: 2, name: "James Park",     role: "Caregiver",        experience: "2 yrs experience", initials: "JP", color: "#dbeafe" },
  { id: 3, name: "Emily Chen",     role: "Support Worker",   experience: "3 yrs experience", initials: "EC", color: "#dcfce7" },
  { id: 4, name: "Michael Torres", role: "Senior Caregiver", experience: "6 yrs experience", initials: "MT", color: "#fef3c7" },
  { id: 5, name: "Rachel Brown",   role: "Caregiver",        experience: "1 yr experience",  initials: "RB", color: "#ede9fe" },
  { id: 6, name: "David Kim",      role: "Support Worker",   experience: "5 yrs experience", initials: "DK", color: "#ffedd5" },
  { id: 7, name: "Anna Garcia",    role: "Senior Caregiver", experience: "7 yrs experience", initials: "AG", color: "#f0fdf4" },
  { id: 8, name: "Tom Anderson",   role: "Caregiver",        experience: "2 yrs experience", initials: "TA", color: "#e0f2fe" },
];

const steps = [
  { id: 1, title: "House Details",           description: "Name, address, capacity" },
  { id: 2, title: "Staff Assignment",        description: "Assign at least one staff member" },
  { id: 3, title: "Initial Clients",         description: "Optional – Skip if needed" },
  { id: 4, title: "Compliance Setup",        description: "Inspection schedules & frequencies" },
  { id: 5, title: "Inventory Baseline",      description: "Optional – Skip if needed" },
  { id: 6, title: "Emergency Preparedness",  description: "72-hour kit & emergency contacts" },
  { id: 7, title: "Review & Confirm",        description: "Final check before saving" },
];

const AddHouse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const programType = queryParams.get("program") || "family-treatment";

  const programInfo = {
    "pdd": {
      name: "Person with Developmental Disability (PDD)",
      shortName: "PDD",
      path: "/admin-dashboard/pdd-houses"
    },
    "family-treatment": {
      name: "Family Treatment Program",
      shortName: "Family Treatment",
      path: "/admin-dashboard/family-treatment-houses"
    },
    "child-youth": {
      name: "Child & Youth Program Cycle",
      shortName: "Child & Youth",
      path: "/admin-dashboard/child-youth-houses"
    }
  }[programType] || { name: "Family Treatment Program", shortName: "Family Treatment", path: "/admin-dashboard/family-treatment-houses" };

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState("Bedroom Essentials");
  const [inventoryTab, setInventoryTab] = useState("house");
  const [expandedKitCategory, setExpandedKitCategory] = useState(null);
  const [formData, setFormData] = useState({
    houseName: "",
    houseCode: "",
    photo: null,
    // Address fields
    streetAddress: "",
    city: "",
    province: "Alberta",
    postalCode: "",
    country: "Canada",
    // Capacity fields
    maxCapacity: "",
    totalBedrooms: "",
    totalBathrooms: "",
    totalCommonAreas: "",
    hasAccessibility: false,
    hasSecuredStorage: true,
    assignedStaff: [],
    searchQuery: "",
    shifts: {
      morning: [],
      evening: [],
      night: [],
      weekend: [],
    },
    assignedClients: [
      {
        id: "client_1",
        name: "Joseph Tate",
        caseId: "CVIM-001044",
        age: 14,
        serviceType: "Respite",
        room: "A-101",
        initials: "JT",
        color: "#fef3c7", // light yellow
        textColor: "#b56d10", // dark amber/yellow
        supervisor: {
          name: "Sarah M.",
          initials: "SM",
          color: "#fce7f3", // pink matching Sarah Mitchell
          textColor: "#9d174d"
        }
      }
    ],
    clientSearchQuery: "",
    complianceSchedules: {
      fireSafety: "",
      healthSafety: "",
      medicationAudit: "",
      fireDrill: "",
      hygieneInspection: "",
      ohsInspection: ""
    },
    inventory: {
      "Bathroom Essentials": {
        "Bath Towels": { qty: "18", location: "Bathroom Storage", notes: "" },
        "Hand Towels": { qty: "12", location: "Bathroom Storage", notes: "" },
        "Bath Mats": { qty: "3", location: "Bathroom Storage", notes: "" },
        "Soap Dispensers": { qty: "4", location: "Bathrooms", notes: "" },
        "Toilet Brushes": { qty: "3", location: "Bathrooms", notes: "" }
      },
      "Kitchen Essentials": {
        "Plates (Dinner)": { qty: "18", location: "Kitchen Cabinet A", notes: "" },
        "Bowls": { qty: "18", location: "Kitchen Cabinet A", notes: "" },
        "Drinking Glasses": { qty: "18", location: "Kitchen Cabinet B", notes: "" },
        "Cutlery Sets": { qty: "18", location: "Kitchen Drawer", notes: "" },
        "Cooking Pots": { qty: "6", location: "Kitchen Storage", notes: "" }
      },
      "Cleaning Supplies": {
        "All-Purpose Cleaner": { qty: "6", location: "Cleaning Closet", notes: "" },
        "Disinfectant Wipes": { qty: "12", location: "Cleaning Closet", notes: "" },
        "Mop & Bucket": { qty: "2", location: "Cleaning Closet", notes: "" },
        "Vacuum Bags": { qty: "10", location: "Cleaning Closet", notes: "" },
        "Trash Bags": { qty: "100", location: "Cleaning Closet", notes: "" }
      },
      "Safety Equipment": {
        "Smoke Detectors": { qty: "8", location: "Ceiling Mounted", notes: "" },
        "Fire Extinguisher (ABC)": { qty: "3", location: "Kitchen, Hallways", notes: "" },
        "Carbon Monoxide Detectors": { qty: "4", location: "Near Bedrooms", notes: "" },
        "First Aid Kit (basic)": { qty: "2", location: "Office, Kitchen", notes: "" },
        "Emergency Flashlights": { qty: "4", location: "Various Locations", notes: "" }
      },
      "Maintenance Tools": {
        "Screwdriver Set": { qty: "1", location: "Maintenance Closet", notes: "" },
        "Hammer": { qty: "2", location: "Maintenance Closet", notes: "" },
        "Pliers": { qty: "2", location: "Maintenance Closet", notes: "" },
        "Tape Measure": { qty: "1", location: "Maintenance Closet", notes: "" },
        "Light Bulb Spares": { qty: "24", location: "Maintenance Closet", notes: "" }
      }
    }, // Stores { [category]: { [itemName]: { qty: "", location: "", notes: "" } } },
    emergencyKit: {
      "Water Supply": {
        "Bottled Water (Cases)": { qty: "4", location: "Emergency Storage", notes: "" },
        "Water Purification Tablets": { qty: "2", location: "Emergency Storage", notes: "" },
        "Water Storage Containers": { qty: "3", location: "Emergency Storage", notes: "" }
      },
      "Food Supply": {
        "Non-perishable Meals (MREs)": { qty: "21", location: "Emergency Storage", notes: "" },
        "Canned Goods": { qty: "14", location: "Emergency Storage", notes: "" },
        "Energy / Granola Bars": { qty: "24", location: "Emergency Storage", notes: "" },
        "Dried Foods / Trail Mix": { qty: "7", location: "Emergency Storage", notes: "" },
        "Infant Formula / Special Dietary": { qty: "0", location: "Emergency Storage", notes: "" }
      }
    },
    emergencyPreparedness: {
      kitItems: [
        { name: "Water (bottled/jugs)", qty: "", status: "Pending" },
        { name: "Non-perishable Meals", qty: "", status: "Pending" },
        { name: "First Aid Kit (72h)", qty: "", status: "Pending" },
        { name: "Flashlights & Batteries", qty: "", status: "Pending" },
        { name: "Emergency Blankets", qty: "", status: "Pending" },
      ],
      contacts: [
        { role: "Primary Contact",   name: "", phone: "", email: "" },
        { role: "Secondary Contact", name: "", phone: "", email: "" },
        { role: "Medical Liaison",   name: "", phone: "", email: "" },
      ],
      hasEvacuationPlan: false,
      musterPoint: "",
      backupMusterPoint: "",
    },
    reviewSettings: {
      notifyStaff: false,
      scheduleInspections: false
    }
  });
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Draft Save & Restore State & Setup
  const draftKey = `house_draft_${programType}`;
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [tempDraft, setTempDraft] = useState(null);

  // 1. Check for saved draft on component mount
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure there is some meaningful progress before prompting
        const hasProgress = parsed.formData && (
          parsed.formData.houseName || 
          parsed.formData.streetAddress || 
          parsed.formData.city ||
          (parsed.formData.assignedStaff && parsed.formData.assignedStaff.length > 0) ||
          parsed.currentStep > 1
        );
        if (hasProgress) {
          setTempDraft(parsed);
          setShowRestoreDialog(true);
        }
      } catch (e) {
        console.warn("Failed to restore draft", e);
      }
    }
  }, [draftKey]);

  // 2. Background Auto-save effect
  useEffect(() => {
    if (isSubmitting) return;

    const draftData = {
      formData: {
        ...formData,
        photo: null // File objects cannot be serialized
      },
      currentStep
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [formData, currentStep, draftKey, isSubmitting]);

  // 3. Manual Draft Save & Action Handlers
  const handleResumeDraft = () => {
    if (tempDraft) {
      setFormData(prev => ({
        ...prev,
        ...tempDraft.formData
      }));
      setCurrentStep(tempDraft.currentStep);
      toast.success("Progress restored!", {
        description: `Successfully resumed your draft from step ${tempDraft.currentStep}.`
      });
    }
    setShowRestoreDialog(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(draftKey);
    setShowRestoreDialog(false);
    toast.info("Draft discarded", {
      description: "Started a fresh house creation form."
    });
  };

  const handleSaveDraftManual = () => {
    const draftData = {
      formData: {
        ...formData,
        photo: null
      },
      currentStep
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    toast.success("Draft saved successfully!", {
      description: "You can resume this form at any time."
    });
  };
  
  // Client modal states & handlers
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: "",
    caseId: "",
    age: "",
    serviceType: "Respite",
    room: "",
    supervisorId: "sarah_mitchell"
  });

  const handleAddClientClick = () => {
    setEditingClient(null);
    setClientForm({
      name: "",
      caseId: "",
      age: "",
      serviceType: "Respite",
      room: "",
      supervisorId: "sarah_mitchell"
    });
    setIsClientModalOpen(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    let supervisorId = "";
    if (client.supervisor) {
      if (client.supervisor.name === "Sarah M." || client.supervisor.name === "Sarah Mitchell") {
        supervisorId = "sarah_mitchell";
      } else {
        const staff = formData.assignedStaff.find(s => {
          const nameParts = s.name.split(' ');
          const shortName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1][0]}.` : s.name;
          return shortName === client.supervisor.name || s.name === client.supervisor.name;
        });
        if (staff) {
          supervisorId = staff.id.toString();
        }
      }
    }
    setClientForm({
      name: client.name,
      caseId: client.caseId,
      age: client.age,
      serviceType: client.serviceType,
      room: client.room === "N/A" ? "" : client.room,
      supervisorId: supervisorId
    });
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = (clientId) => {
    setFormData({
      ...formData,
      assignedClients: formData.assignedClients.filter(c => c.id !== clientId)
    });
    toast.success("Client removed.");
  };

  const handleSaveClient = () => {
    if (!clientForm.name || !clientForm.caseId || !clientForm.age) {
      toast.error("Please fill in all required fields.");
      return;
    }

    let selectedSupervisor = null;
    if (clientForm.supervisorId === "sarah_mitchell") {
      selectedSupervisor = {
        name: "Sarah M.",
        initials: "SM",
        color: "#fce7f3", // Pink
        textColor: "#9d174d"
      };
    } else if (clientForm.supervisorId) {
      const staff = formData.assignedStaff.find(s => s.id.toString() === clientForm.supervisorId);
      if (staff) {
        const nameParts = staff.name.split(' ');
        const shortName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1][0]}.` : staff.name;
        selectedSupervisor = {
          name: shortName,
          initials: staff.initials || nameParts.map(n => n[0]).join('').toUpperCase().substring(0, 2),
          color: staff.color || "#f3e8ff",
          textColor: "#701a75"
        };
      }
    }

    const avatarColorPalette = [
      { bg: '#fef3c7', text: '#b56d10' }, // Yellow/Amber
      { bg: '#f3e8ff', text: '#701a75' }, // Purple/Lavender
      { bg: '#dcfce7', text: '#14532e' }, // Green
      { bg: '#e0f2fe', text: '#0369a1' }, // Blue
      { bg: '#ffedd5', text: '#c2410c' }, // Orange
      { bg: '#fee2e2', text: '#b91c1c' }, // Red
    ];
    
    let nameHash = 0;
    for (let i = 0; i < clientForm.name.length; i++) {
      nameHash += clientForm.name.charCodeAt(i);
    }
    const colorPair = avatarColorPalette[nameHash % avatarColorPalette.length];
    const initials = clientForm.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const clientData = {
      id: editingClient ? editingClient.id : `client_${Date.now()}`,
      name: clientForm.name,
      caseId: clientForm.caseId,
      age: Number(clientForm.age),
      serviceType: clientForm.serviceType,
      room: clientForm.room || "N/A",
      initials: initials,
      color: colorPair.bg,
      textColor: colorPair.text,
      supervisor: selectedSupervisor
    };

    let updatedClients;
    if (editingClient) {
      updatedClients = formData.assignedClients.map(c => c.id === editingClient.id ? clientData : c);
      toast.success("Client updated successfully!");
    } else {
      updatedClients = [...formData.assignedClients, clientData];
      toast.success("Client added successfully!");
    }

    setFormData({
      ...formData,
      assignedClients: updatedClients
    });

    setIsClientModalOpen(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleContinue = async () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        let photoURL = "";
        
        // 1. Handle Photo Upload if exists (fixed to use formData.photo)
        if (formData.photo) {
          const photoRef = ref(storage, `houses/${Date.now()}_${formData.photo.name}`);
          await uploadBytes(photoRef, formData.photo);
          photoURL = await getDownloadURL(photoRef);
        }

        // 2. Prepare Final Data (strip out binary photo File to prevent Firestore serialization crash)
        const houseId = `house_${Date.now()}`;
        const { photo, ...cleanFormData } = formData;
        const finalData = {
          ...cleanFormData,
          id: houseId,
          programType: programType,
          programName: programInfo.name,
          housePhoto: photoURL, // Store the URL instead of the File object
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "Active"
        };

        // 3. Save to Firestore
        await setDoc(doc(db, "houses", houseId), finalData);

        // 4. Clear saved draft on successful creation
        localStorage.removeItem(draftKey);

        toast.success("House created successfully!", {
          description: `${formData.houseName || 'New House'} has been added to the ${programInfo.shortName} program.`,
        });
        
        navigate(programInfo.path);
      } catch (error) {
        console.error("Error creating house:", error);
        toast.error("Failed to create house", {
          description: "An error occurred while saving to the database. Please try again."
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 overflow-auto">
      <div 
        className="bg-white w-full max-w-[1100px] h-[800px] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Top Header */}
        <div className="h-[60px] border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-[#145228]">
              <Shield size={18} strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-400">
              <span className="text-[#145228] cursor-pointer hover:underline" onClick={() => navigate("/admin-dashboard/services")}>Programs</span>
              <span className="text-[10px]">›</span>
              <span className="text-[#145228] cursor-pointer hover:underline" onClick={() => navigate(programInfo.path)}>{programInfo.name}</span>
              <span className="text-[10px]">›</span>
              <span className="text-gray-900">New House</span>
            </div>
          </div>
          
          <h2 className="absolute left-1/2 -translate-x-1/2 font-bold text-[#0f172a] text-[16px]">
            Add New House
          </h2>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#1D6033' }} />
              <span style={{ fontSize: 12, color: '#757575' }}>Draft saved · just now</span>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="flex flex-col overflow-y-auto shrink-0" style={{ width: 280, backgroundColor: '#FAFAFA', borderRight: '1px solid #EEEEEE', padding: '24px 16px' }}>
            <div className="flex-1">
              {steps.map((step, index) => {
                const isCompleted = step.id < currentStep;
                const isCurrent   = step.id === currentStep;
                return (
                  <div key={step.id}>
                    <button
                      onClick={() => { if (step.id <= currentStep) setCurrentStep(step.id); }}
                      disabled={step.id > currentStep}
                      className="w-full flex items-center gap-3 rounded-lg transition-colors"
                      style={{ minHeight: 56, padding: '12px 16px', cursor: step.id <= currentStep ? 'pointer' : 'default' }}
                    >
                      {/* Step circle */}
                      <div className="rounded-full flex items-center justify-center shrink-0" style={{
                        width: 28, height: 28,
                        backgroundColor: isCompleted ? '#1D6033' : isCurrent ? '#FFFFFF' : '#EEEEEE',
                        border: isCurrent ? '2px solid #1D6033' : 'none',
                      }}>
                        {isCompleted
                          ? <Check size={13} style={{ color: '#FFFFFF' }} strokeWidth={3} />
                          : <span style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? '#1D6033' : '#9E9E9E' }}>{step.id}</span>
                        }
                      </div>
                      {/* Step label */}
                      <div className="flex-1 text-left">
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: isCurrent ? '#212121' : isCompleted ? '#424242' : '#9E9E9E' }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#9E9E9E' }}>{step.description}</div>
                      </div>
                    </button>
                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div style={{ paddingLeft: 23 }}>
                        <div style={{ width: 1, height: 12, backgroundColor: isCompleted ? '#1D6033' : '#E0E0E0' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Bottom hint */}
            <div className="px-4 py-4 border-t mt-4" style={{ borderColor: '#EEEEEE' }}>
              <div className="flex items-start gap-2">
                <Info size={13} className="shrink-0 mt-0.5" style={{ color: '#757575' }} />
                <p style={{ fontSize: 11, color: '#757575' }}>Saving as draft? All entered data persists for 30 days.</p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-[#ffffff] p-10 overflow-y-auto">
            {currentStep === 1 ? (
              <div className="max-w-[640px]">
                <div className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 1 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-2 tracking-tight">
                  House Details
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-10 leading-relaxed">
                  Basic information about the property and its capacity.
                </p>

                <div className="rounded-2xl border border-gray-100 p-8 space-y-8 bg-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    House Identity
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                        House Name <span className="text-[#145228] ml-0.5">*</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Maple Grove House"
                        value={formData.houseName}
                        onChange={(e) => setFormData({...formData, houseName: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                        House Code / Internal ID <span className="text-[#145228] ml-0.5">*</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="XX-NNN"
                        value={formData.houseCode}
                        onChange={(e) => setFormData({...formData, houseCode: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                      />
                      <p className="text-[11px] text-gray-400 mt-2 font-medium">Used for reports. Format: XX-NNN</p>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-3">
                        Display Photo
                      </label>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 bg-[#fafafa] hover:bg-[#f8fcf9] hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden min-h-[160px]"
                      >
                        {photoPreview ? (
                          <div className="absolute inset-0">
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="p-3 rounded-xl bg-white shadow-sm text-[#145228]">
                                <Upload size={24} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 rounded-xl bg-white shadow-sm text-gray-400 group-hover:text-[#145228] transition-colors">
                              <Upload size={24} />
                            </div>
                            <p className="text-[13px] font-medium text-gray-500">
                              Drop image or <span className="text-[#145228] font-bold underline">browse</span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Card */}
                <div className="rounded-2xl border border-gray-100 p-8 space-y-8 bg-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.02)] mt-6">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Address
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                        Street Address <span className="text-[#145228] ml-0.5">*</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="Enter street address"
                        value={formData.streetAddress}
                        onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="relative">
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          City <span className="text-[#145228] ml-0.5">*</span>
                        </label>
                        <input 
                          type="text"
                          placeholder="City"
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          Province
                        </label>
                        <select 
                          value={formData.province}
                          onChange={(e) => setFormData({...formData, province: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] bg-white appearance-none"
                        >
                          <option value="Alberta">Alberta</option>
                          <option value="British Columbia">British Columbia</option>
                          <option value="Manitoba">Manitoba</option>
                          <option value="New Brunswick">New Brunswick</option>
                          <option value="Newfoundland and Labrador">Newfoundland and Labrador</option>
                          <option value="Nova Scotia">Nova Scotia</option>
                          <option value="Ontario">Ontario</option>
                          <option value="Prince Edward Island">Prince Edward Island</option>
                          <option value="Quebec">Quebec</option>
                          <option value="Saskatchewan">Saskatchewan</option>
                        </select>
                        <div className="absolute right-4 bottom-3.5 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          Postal Code <span className="text-[#145228] ml-0.5">*</span>
                        </label>
                        <input 
                          type="text"
                          placeholder="Postal Code"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          Country
                        </label>
                        <select 
                          value={formData.country}
                          onChange={(e) => setFormData({...formData, country: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px] bg-white appearance-none"
                        >
                          <option value="Canada">Canada</option>
                          <option value="United States">United States</option>
                        </select>
                        <div className="absolute right-4 bottom-3.5 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capacity & Layout Card */}
                <div className="rounded-2xl border border-gray-100 p-8 space-y-8 bg-[#ffffff] shadow-[0_2px_8_rgba(0,0,0,0.02)] mt-6 mb-8">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Capacity & Layout
                  </h3>

                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          Maximum Capacity <span className="text-[#145228] ml-0.5">*</span>
                        </label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={formData.maxCapacity}
                          onChange={(e) => setFormData({...formData, maxCapacity: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          Total Bedrooms <span className="text-[#145228] ml-0.5">*</span>
                        </label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={formData.totalBedrooms}
                          onChange={(e) => setFormData({...formData, totalBedrooms: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                          Total Bathrooms <span className="text-[#145228] ml-0.5">*</span>
                        </label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={formData.totalBathrooms}
                          onChange={(e) => setFormData({...formData, totalBathrooms: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-2.5">
                        Total Common Areas
                      </label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={formData.totalCommonAreas}
                        onChange={(e) => setFormData({...formData, totalCommonAreas: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[14px]"
                      />
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-50">
                      <div className="flex items-center justify-between group cursor-pointer" onClick={() => setFormData({...formData, hasAccessibility: !formData.hasAccessibility})}>
                        <span className="text-[14px] font-semibold text-[#374151]">Has accessibility accommodations</span>
                        <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.hasAccessibility ? 'bg-[#145228]' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.hasAccessibility ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between group cursor-pointer" onClick={() => setFormData({...formData, hasSecuredStorage: !formData.hasSecuredStorage})}>
                        <span className="text-[14px] font-semibold text-[#374151]">Has secured/locked storage for medications & sharps</span>
                        <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.hasSecuredStorage ? 'bg-[#145228]' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.hasSecuredStorage ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentStep === 2 ? (
              <div className="max-w-[900px] w-full mx-auto">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 2 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-3 tracking-tight">
                  Staff Assignment
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-10 leading-relaxed">
                  Assign the staff who will operate this house. You can change assignments anytime later.
                </p>

                {/* Available Staff Box */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col">
                  {/* Box Header */}
                  <div className="px-5 border-b border-gray-100 flex items-center justify-between bg-white" style={{ height: 56 }}>
                    <div className="flex items-center gap-3">
                      <h3 className="text-[12px] font-bold text-[#374151] uppercase tracking-wider">Available Staff</h3>
                      <span className="px-2.5 py-0.5 rounded-xl bg-emerald-50 text-[#145228] text-[11px] font-bold">
                        {MOCK_STAFF.length} available
                      </span>
                      {formData.assignedStaff.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-xl bg-gray-100 text-gray-600 text-[11px] font-bold">
                          {formData.assignedStaff.length} selected
                        </span>
                      )}
                    </div>
                    <div className="relative" style={{ width: 240 }}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search by name or role..."
                        value={formData.searchQuery}
                        onChange={(e) => setFormData({ ...formData, searchQuery: e.target.value })}
                        className="w-full pl-9 pr-3 rounded-lg border border-gray-200 focus:outline-none text-[13px] placeholder:text-gray-400"
                        style={{ height: 32 }}
                      />
                    </div>
                  </div>

                  {/* Staff Pool List */}
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {MOCK_STAFF.filter(s =>
                      s.name.toLowerCase().includes((formData.searchQuery || "").toLowerCase()) ||
                      s.role.toLowerCase().includes((formData.searchQuery || "").toLowerCase())
                    ).map((staff, index) => {
                      const isSelected = formData.assignedStaff.some(s => s.id === staff.id);
                      return (
                        <div
                          key={staff.id}
                          onClick={() => setFormData({
                            ...formData,
                            assignedStaff: isSelected
                              ? formData.assignedStaff.filter(s => s.id !== staff.id)
                              : [...formData.assignedStaff, staff]
                          })}
                          className="flex items-center gap-4 cursor-pointer transition-colors"
                          style={{
                            height: 64, padding: '0 20px',
                            borderBottom: index < MOCK_STAFF.length - 1 ? '1px solid #f5f5f5' : 'none',
                            backgroundColor: isSelected ? '#F1F8E9' : 'transparent',
                            borderLeft: isSelected ? '3px solid #1D6033' : '3px solid transparent',
                          }}
                        >
                          {/* Checkbox */}
                          <div className="flex items-center justify-center rounded shrink-0" style={{
                            width: 18, height: 18,
                            border: isSelected ? 'none' : '1.5px solid #BDBDBD',
                            backgroundColor: isSelected ? '#1D6033' : '#FFFFFF',
                          }}>
                            {isSelected && <Check size={12} style={{ color: '#FFFFFF' }} strokeWidth={3} />}
                          </div>

                          {/* Avatar */}
                          <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-[14px] text-gray-600 border border-black/5"
                            style={{ width: 40, height: 40, backgroundColor: staff.color || '#f3f4f6' }}>
                            {staff.initials}
                          </div>

                          {/* Name + Role */}
                          <div className="flex-1">
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{staff.name}</div>
                            <div style={{ fontSize: 12, color: '#757575' }}>{staff.role} · {staff.experience}</div>
                          </div>

                          {/* Status badge */}
                          <div className="px-3 py-1 rounded flex items-center gap-1.5 shrink-0" style={{
                            fontSize: 11.5, fontWeight: 500, color: '#2E7D32', backgroundColor: '#E8F5E9',
                          }}>
                            <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: '#2E7D32' }} />
                            Available
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Box Footer */}
                  <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2" style={{ backgroundColor: '#FAFAFA' }}>
                    <Info size={13} style={{ color: '#757575' }} />
                    <p className="text-[12px] text-gray-500">
                      Showing {MOCK_STAFF.length} of 24 total staff · {24 - MOCK_STAFF.length} already assigned to other houses.
                    </p>
                  </div>
                </div>

                {/* Shift Rotation Box */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col mt-6">
                  {/* Box Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#ffffff]">
                    <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wider">
                      Shift Rotation
                    </h3>
                    <button className="text-[12px] font-bold text-[#145228] flex items-center gap-1 hover:underline">
                      How shifts work <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Shifts List */}
                  <div className="divide-y divide-gray-50">
                    {/* Morning Shift */}
                    <div className="px-6 py-5 flex items-center gap-8">
                      <div className="flex items-center gap-4 w-[200px] shrink-0">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                          <Sun size={20} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#0f172a]">Morning</h4>
                          <p className="text-[12px] text-gray-500 font-medium">8:00 AM – 4:00 PM</p>
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <div className="min-h-[46px] w-full px-2 py-2 rounded-xl border border-gray-100 bg-gray-50/30 flex flex-wrap gap-2 items-center">
                          {formData.shifts.morning.map(staff => (
                            <div key={staff.id} className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-white border border-gray-100 shadow-sm transition-all hover:border-emerald-200">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 border border-black/5"
                                style={{ backgroundColor: staff.color || '#f3f4f6' }}
                              >
                                {staff.initials}
                              </div>
                              <span className="text-[12px] font-bold text-[#374151]">{staff.name}</span>
                              <button 
                                onClick={() => setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, morning: formData.shifts.morning.filter(s => s.id !== staff.id) }
                                })}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <select 
                            className="bg-transparent border-none focus:ring-0 text-[13px] text-gray-400 font-medium cursor-pointer flex-1 min-w-[150px] outline-none"
                            onChange={(e) => {
                              const staff = MOCK_STAFF.find(s => s.id.toString() === e.target.value);
                              if (staff && !formData.shifts.morning.find(s => s.id === staff.id)) {
                                setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, morning: [...formData.shifts.morning, staff] }
                                });
                              }
                              e.target.value = "";
                            }}
                          >
                            <option value="">Select staff...</option>
                            {MOCK_STAFF.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-[120px] justify-end">
                        <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[12px] font-bold border transition-colors ${formData.shifts.morning.length >= 2 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                          {formData.shifts.morning.length < 2 && <AlertTriangle size={12} />}
                          {formData.shifts.morning.length >= 2 && <Check size={12} />}
                          {formData.shifts.morning.length}/2
                        </div>
                        <button className="p-2 text-gray-400 hover:text-[#145228] hover:bg-emerald-50 rounded-lg transition-all">
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Evening Shift */}
                    <div className="px-6 py-5 flex items-center gap-8">
                      <div className="flex items-center gap-4 w-[200px] shrink-0">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                          <CloudMoon size={20} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#0f172a]">Evening</h4>
                          <p className="text-[12px] text-gray-500 font-medium">4:00 PM – 12:00 AM</p>
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <div className="min-h-[46px] w-full px-2 py-2 rounded-xl border border-gray-100 bg-gray-50/30 flex flex-wrap gap-2 items-center">
                          {formData.shifts.evening.map(staff => (
                            <div key={staff.id} className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-white border border-gray-100 shadow-sm transition-all hover:border-emerald-200">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 border border-black/5"
                                style={{ backgroundColor: staff.color || '#f3f4f6' }}
                              >
                                {staff.initials}
                              </div>
                              <span className="text-[12px] font-bold text-[#374151]">{staff.name}</span>
                              <button 
                                onClick={() => setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, evening: formData.shifts.evening.filter(s => s.id !== staff.id) }
                                })}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <select 
                            className="bg-transparent border-none focus:ring-0 text-[13px] text-gray-400 font-medium cursor-pointer flex-1 min-w-[150px] outline-none"
                            onChange={(e) => {
                              const staff = MOCK_STAFF.find(s => s.id.toString() === e.target.value);
                              if (staff && !formData.shifts.evening.find(s => s.id === staff.id)) {
                                setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, evening: [...formData.shifts.evening, staff] }
                                });
                              }
                              e.target.value = "";
                            }}
                          >
                            <option value="">Select staff...</option>
                            {MOCK_STAFF.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-[120px] justify-end">
                        <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[12px] font-bold border transition-colors ${formData.shifts.evening.length >= 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                          {formData.shifts.evening.length < 1 && <AlertTriangle size={12} />}
                          {formData.shifts.evening.length >= 1 && <Check size={12} />}
                          {formData.shifts.evening.length}/1
                        </div>
                        <button className="p-2 text-gray-400 hover:text-[#145228] hover:bg-emerald-50 rounded-lg transition-all">
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Night Shift */}
                    <div className="px-6 py-5 flex items-center gap-8">
                      <div className="flex items-center gap-4 w-[200px] shrink-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <Moon size={20} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#0f172a]">Night</h4>
                          <p className="text-[12px] text-gray-500 font-medium">12:00 AM – 8:00 AM</p>
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <div className="min-h-[46px] w-full px-2 py-2 rounded-xl border border-gray-100 bg-gray-50/30 flex flex-wrap gap-2 items-center">
                          {formData.shifts.night.map(staff => (
                            <div key={staff.id} className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-white border border-gray-100 shadow-sm transition-all hover:border-emerald-200">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 border border-black/5"
                                style={{ backgroundColor: staff.color || '#f3f4f6' }}
                              >
                                {staff.initials}
                              </div>
                              <span className="text-[12px] font-bold text-[#374151]">{staff.name}</span>
                              <button 
                                onClick={() => setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, night: formData.shifts.night.filter(s => s.id !== staff.id) }
                                })}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <select 
                            className="bg-transparent border-none focus:ring-0 text-[13px] text-gray-400 font-medium cursor-pointer flex-1 min-w-[150px] outline-none"
                            onChange={(e) => {
                              const staff = MOCK_STAFF.find(s => s.id.toString() === e.target.value);
                              if (staff && !formData.shifts.night.find(s => s.id === staff.id)) {
                                setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, night: [...formData.shifts.night, staff] }
                                });
                              }
                              e.target.value = "";
                            }}
                          >
                            <option value="">Select staff...</option>
                            {MOCK_STAFF.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-[120px] justify-end">
                        <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[12px] font-bold border transition-colors ${formData.shifts.night.length >= 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                          {formData.shifts.night.length < 1 && <AlertTriangle size={12} />}
                          {formData.shifts.night.length >= 1 && <Check size={12} />}
                          {formData.shifts.night.length}/1
                        </div>
                        <button className="p-2 text-gray-400 hover:text-[#145228] hover:bg-emerald-50 rounded-lg transition-all">
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Weekend Shift */}
                    <div className="px-6 py-5 flex items-center gap-8">
                      <div className="flex items-center gap-4 w-[200px] shrink-0">
                        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
                          <CalendarDays size={20} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#0f172a]">Weekend</h4>
                          <p className="text-[12px] text-gray-500 font-medium">Sat–Sun, 8AM – 8PM</p>
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <div className="min-h-[46px] w-full px-2 py-2 rounded-xl border border-gray-100 bg-gray-50/30 flex flex-wrap gap-2 items-center">
                          {formData.shifts.weekend.map(staff => (
                            <div key={staff.id} className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-white border border-gray-100 shadow-sm transition-all hover:border-emerald-200">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 border border-black/5"
                                style={{ backgroundColor: staff.color || '#f3f4f6' }}
                              >
                                {staff.initials}
                              </div>
                              <span className="text-[12px] font-bold text-[#374151]">{staff.name}</span>
                              <button 
                                onClick={() => setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, weekend: formData.shifts.weekend.filter(s => s.id !== staff.id) }
                                })}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <select 
                            className="bg-transparent border-none focus:ring-0 text-[13px] text-gray-400 font-medium cursor-pointer flex-1 min-w-[150px] outline-none"
                            onChange={(e) => {
                              const staff = MOCK_STAFF.find(s => s.id.toString() === e.target.value);
                              if (staff && !formData.shifts.weekend.find(s => s.id === staff.id)) {
                                setFormData({
                                  ...formData,
                                  shifts: { ...formData.shifts, weekend: [...formData.shifts.weekend, staff] }
                                });
                              }
                              e.target.value = "";
                            }}
                          >
                            <option value="">Select staff...</option>
                            {MOCK_STAFF.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-[120px] justify-end">
                        <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[12px] font-bold border transition-colors ${formData.shifts.weekend.length >= 2 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                          {formData.shifts.weekend.length < 2 && <AlertTriangle size={12} />}
                          {formData.shifts.weekend.length >= 2 && <Check size={12} />}
                          {formData.shifts.weekend.length}/2
                        </div>
                        <button className="p-2 text-gray-400 hover:text-[#145228] hover:bg-emerald-50 rounded-lg transition-all">
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Box Footer */}
                  <div className="px-6 py-4 bg-emerald-50/50 border-t border-emerald-100/50 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#145228] shadow-sm">
                      <Info size={14} />
                    </div>
                    <p className="text-[12px] text-[#145228] font-medium">
                      💡 Family Forever recommends 24/7 coverage. Staff can be assigned to multiple shifts. Shifts can be edited anytime from the Shift tab.
                    </p>
                  </div>
                </div>

                {/* Coverage Summary Bar */}
                <div className="mt-6 p-5 rounded-2xl border border-gray-200 bg-white flex items-center justify-between shadow-sm border-l-4 border-l-[#145228]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-[#145228]">
                      <BarChart3 size={20} />
                    </div>
                    <p className="text-[14px] font-medium text-gray-700">
                      Total Weekly Coverage: <span className="font-bold text-[#0f172a]">0 hours</span> across 4 shifts
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 flex items-center gap-2 text-[12px] font-bold border border-amber-100">
                    <Check size={14} className="opacity-50" />
                    Coverage Gap
                  </div>
                </div>
              </div>
            ) : currentStep === 3 ? (
              <div className="max-w-[900px] w-full mx-auto">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 3 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-3 tracking-tight">
                  Initial Clients
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-8 leading-relaxed">
                  Add the residents already living in this house. You can also add clients later from the Clients tab.
                </p>

                <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-2xl p-6 mb-10 flex items-start gap-4">
                  <div className="text-[#3b82f6] mt-1">
                    <Info size={20} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[15px] text-[#1e293b] font-medium leading-relaxed">
                      No residents yet? You can skip this step and admit clients individually later. Most new houses start empty.
                    </p>
                    <button 
                      onClick={() => setCurrentStep(4)}
                      className="text-[15px] font-bold text-[#3b82f6] hover:underline flex items-center gap-1"
                    >
                      Skip this step →
                    </button>
                  </div>
                </div>

                {/* Clients In House Box */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col">
                  {/* Box Header */}
                  <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-[#ffffff]">
                    <h3 className="text-[12px] font-bold text-[#374151] uppercase tracking-widest">
                      Clients in this house
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#e6f4ea] text-[#137333] text-[11px] font-bold">
                      {formData.assignedClients.length} added
                    </span>
                  </div>

                  {/* Clients List Area */}
                  <div className="min-h-[380px] flex flex-col">
                    {formData.assignedClients.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-400/60 mb-6">
                          <UserPlus size={36} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-[18px] font-bold text-[#0f172a] mb-2">No clients added yet</h4>
                        <p className="text-[14px] text-gray-500 font-medium mb-8 text-center max-w-[420px] leading-relaxed">
                          Use the existing Add Client flow to create new client records. Once created, they'll appear here.
                        </p>
                        
                        <button 
                          onClick={handleAddClientClick}
                          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#1a532e] text-[15px] font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-[0.98] mb-5"
                        >
                          <span className="text-[20px] font-normal leading-none mb-0.5">+</span>
                          Add New Client
                        </button>
                        
                        <button className="text-[14px] font-bold text-[#3b82f6] hover:underline flex items-center gap-1.5">
                          Or browse pending intake requests <ChevronRight size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 px-6 py-3.5 bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left">
                          <div className="col-span-4">Client</div>
                          <div className="col-span-1">Age</div>
                          <div className="col-span-2">Service Type</div>
                          <div className="col-span-2">Room</div>
                          <div className="col-span-2">Supervisor</div>
                          <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-gray-100">
                          {formData.assignedClients.map((client) => {
                            const initials = client.initials || client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                            const avatarColor = client.color || '#fef3c7';
                            const avatarTextColor = client.textColor || '#b56d10';
                            
                            // Supervisor info
                            const supervisorName = client.supervisor?.name || "Unassigned";
                            const supervisorInitials = client.supervisor?.initials || supervisorName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                            const supervisorBg = client.supervisor?.color || '#fce7f3';
                            const supervisorTextCol = client.supervisor?.textColor || '#9d174d';

                            return (
                              <div key={client.id} className="grid grid-cols-12 px-6 py-4.5 items-center hover:bg-gray-50/50 transition-colors text-left text-[14px]">
                                {/* Client Column */}
                                <div className="col-span-4 flex items-center gap-4">
                                  <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0"
                                    style={{ backgroundColor: avatarColor, color: avatarTextColor }}
                                  >
                                    {initials}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-[#0f172a] truncate">{client.name}</span>
                                    <span className="text-[12px] text-gray-400 font-mono tracking-tight">{client.caseId}</span>
                                  </div>
                                </div>

                                {/* Age Column */}
                                <div className="col-span-1 text-[#374151] font-medium">
                                  {client.age}
                                </div>

                                {/* Service Type Column */}
                                <div className="col-span-2">
                                  <span className="inline-flex items-center px-3 py-1 rounded-md text-[12px] font-bold bg-[#e6f4ea] text-[#137333]">
                                    {client.serviceType}
                                  </span>
                                </div>

                                {/* Room Column */}
                                <div className="col-span-2 text-[#374151] font-medium tracking-tight">
                                  {client.room}
                                </div>

                                {/* Supervisor Column */}
                                <div className="col-span-2 flex items-center gap-2.5 min-w-0">
                                  <div 
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                                    style={{ backgroundColor: supervisorBg, color: supervisorTextCol }}
                                  >
                                    {supervisorInitials}
                                  </div>
                                  <span className="text-[#374151] font-medium text-[13px] truncate">{supervisorName}</span>
                                </div>

                                {/* Actions Column */}
                                <div className="col-span-1 flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => handleEditClient(client)}
                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Edit Client"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Client"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Box Footer */}
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-[#fafafa]/50">
                    <p className="text-[13px] text-gray-500 font-medium">
                      {formData.assignedClients.length} {formData.assignedClients.length === 1 ? 'client' : 'clients'} added · {Math.max(0, (Number(formData.maxCapacity) || 6) - formData.assignedClients.length)} beds remaining of {Number(formData.maxCapacity) || 6}
                    </p>
                    <button 
                      onClick={handleAddClientClick}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#145228] text-[14px] font-bold text-[#145228] hover:bg-[#145228]/5 transition-all bg-white shadow-sm active:scale-[0.98]"
                    >
                      <Plus size={16} />
                      Add Another Client
                    </button>
                  </div>
                </div>


              </div>
            ) : currentStep === 4 ? (
              <div className="max-w-[900px] w-full mx-auto">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 4 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-3 tracking-tight">
                  Compliance Setup
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-10 leading-relaxed">
                  Define inspection cadences. We've pre-filled industry-standard schedules for Alberta licensed group homes — adjust if needed.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  {/* Card 1: Fire Safety */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                        <ShieldCheck size={22} />
                      </div>
                      <h3 className="font-bold text-[#1e293b] text-[16px]">Fire Safety Inspection</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <select 
                          value={formData.complianceSchedules.fireSafety}
                          onChange={(e) => setFormData({
                            ...formData, 
                            complianceSchedules: { ...formData.complianceSchedules, fireSafety: e.target.value }
                          })}
                          className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-[15px] appearance-none font-bold text-[#0f172a]"
                        >
                          <option value="" disabled hidden>Select Cadence</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annually">Annually</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 font-medium pl-1">Next due : -- -- --</p>
                  </div>

                  {/* Card 2: Health & Safety */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all border-l-4 border-l-red-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-red-50 text-red-500">
                        <Heart size={22} />
                      </div>
                      <h3 className="font-bold text-[#1e293b] text-[16px]">Health & Safety Audit</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <select 
                          value={formData.complianceSchedules.healthSafety}
                          onChange={(e) => setFormData({
                            ...formData, 
                            complianceSchedules: { ...formData.complianceSchedules, healthSafety: e.target.value }
                          })}
                          className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 focus:bg-white transition-all text-[15px] appearance-none font-bold text-[#0f172a]"
                        >
                          <option value="" disabled hidden>Select Cadence</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annually">Annually</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 font-medium pl-1">Next due : -- -- --</p>
                  </div>

                  {/* Card 3: Medication Audit */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500">
                        <Pill size={22} />
                      </div>
                      <h3 className="font-bold text-[#1e293b] text-[16px]">Medication Audit</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <select 
                          value={formData.complianceSchedules.medicationAudit}
                          onChange={(e) => setFormData({
                            ...formData, 
                            complianceSchedules: { ...formData.complianceSchedules, medicationAudit: e.target.value }
                          })}
                          className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all text-[15px] appearance-none font-bold text-[#0f172a]"
                        >
                          <option value="" disabled hidden>Select Cadence</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annually">Annually</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 font-medium pl-1">Next due : -- -- --</p>
                  </div>

                  {/* Card 4: Fire Drill */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500">
                        <Flame size={22} />
                      </div>
                      <h3 className="font-bold text-[#1e293b] text-[16px]">Fire Drill</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <select 
                          value={formData.complianceSchedules.fireDrill}
                          onChange={(e) => setFormData({
                            ...formData, 
                            complianceSchedules: { ...formData.complianceSchedules, fireDrill: e.target.value }
                          })}
                          className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all text-[15px] appearance-none font-bold text-[#0f172a]"
                        >
                          <option value="" disabled hidden>Select Cadence</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annually">Annually</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 font-medium pl-1">Next due : -- -- --</p>
                  </div>

                  {/* Card 5: Hygiene Inspection */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all border-l-4 border-l-teal-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-teal-50 text-teal-500">
                        <Sparkles size={22} />
                      </div>
                      <h3 className="font-bold text-[#1e293b] text-[16px]">Hygiene Inspection</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <select 
                          value={formData.complianceSchedules.hygieneInspection}
                          onChange={(e) => setFormData({
                            ...formData, 
                            complianceSchedules: { ...formData.complianceSchedules, hygieneInspection: e.target.value }
                          })}
                          className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all text-[15px] appearance-none font-bold text-[#0f172a]"
                        >
                          <option value="" disabled hidden>Select Cadence</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annually">Annually</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 font-medium pl-1">Next due : -- -- --</p>
                  </div>

                  {/* Card 6: OHS Inspection */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-purple-50 text-purple-500">
                        <FileSearch size={22} />
                      </div>
                      <h3 className="font-bold text-[#1e293b] text-[16px]">OHS Inspection</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <select 
                          value={formData.complianceSchedules.ohsInspection}
                          onChange={(e) => setFormData({
                            ...formData, 
                            complianceSchedules: { ...formData.complianceSchedules, ohsInspection: e.target.value }
                          })}
                          className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white transition-all text-[15px] appearance-none font-bold text-[#0f172a]"
                        >
                          <option value="" disabled hidden>Select Cadence</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annually">Annually</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 font-medium pl-1">Next due : -- -- --</p>
                  </div>
                </div>

                <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-2xl p-5 mt-10 flex items-center gap-4 shadow-sm border-l-4 border-l-[#3b82f6]">
                  <div className="text-[#3b82f6] p-1.5 rounded-lg bg-white shadow-sm">
                    <Info size={20} />
                  </div>
                  <p className="text-[14px] text-[#1e293b] font-semibold leading-relaxed">
                    💡 These cadences match Alberta Children's Services minimum standards for licensed group homes.
                  </p>
                </div>
              </div>
            ) : currentStep === 5 ? (
              <div className="max-w-[1000px] w-full mx-auto pb-20">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 5 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-3 tracking-tight">
                  Inventory Baseline
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-8 leading-relaxed">
                  Pre-populate the standard inventory checklist. We'll auto-suggest required quantities based on your house capacity.
                </p>

                <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-2xl p-6 mb-10 flex items-start gap-4">
                  <div className="text-[#3b82f6] mt-1">
                    <Info size={20} />
                  </div>
                  <p className="text-[15px] text-[#1e293b] font-medium leading-relaxed">
                    Quantities are auto-suggested based on your <span className="font-bold text-[#1d4ed8]">{formData.maxCapacity || 0}-bed capacity</span>. You can edit any value, remove items you don't need, or add custom items specific to your house.
                  </p>
                </div>

                {/* Inventory Tabs */}
                <div className="flex items-center gap-4 p-2 bg-gray-50/50 rounded-2xl border border-gray-100 mb-8">
                  <button 
                    onClick={() => setInventoryTab("house")}
                    className={`flex items-center gap-3 px-6 py-3.5 rounded-xl transition-all ${inventoryTab === "house" ? "bg-[#f0f9f1] border border-[#145228]/10 text-[#145228] shadow-sm" : "hover:bg-gray-100/50 text-gray-500"}`}
                  >
                    <Package size={20} strokeWidth={inventoryTab === "house" ? 2.5 : 2} />
                    <span className="text-[14px] font-bold">House Inventory</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${inventoryTab === "house" ? "bg-white/80 shadow-sm" : "bg-gray-100"}`}>
                      {Object.values(formData.inventory).reduce((sum, cat) => sum + Object.keys(cat).length, 0)} items
                    </span>
                  </button>
                  <button 
                    onClick={() => setInventoryTab("emergency")}
                    className={`flex items-center gap-3 px-6 py-3.5 rounded-xl transition-all ${inventoryTab === "emergency" ? "bg-[#f0f9f1] border border-[#145228]/10 text-[#145228] shadow-sm" : "hover:bg-gray-100/50 text-gray-500"}`}
                  >
                    <Briefcase size={20} strokeWidth={inventoryTab === "emergency" ? 2.5 : 2} />
                    <span className="text-[14px] font-bold">72-Hour Emergency Kit</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${inventoryTab === "emergency" ? "bg-white/80 shadow-sm" : "bg-gray-100"}`}>
                      {Object.values(formData.emergencyKit).reduce((sum, cat) => sum + Object.keys(cat).length, 0)} items
                    </span>
                  </button>
                  <button 
                    onClick={() => setInventoryTab("sharps")}
                    className={`flex items-center gap-3 px-6 py-3.5 rounded-xl transition-all ${inventoryTab === "sharps" ? "bg-[#f0f9f1] border border-[#145228]/10 text-[#145228] shadow-sm" : "hover:bg-gray-100/50 text-gray-500"}`}
                  >
                    <AlertTriangle size={20} strokeWidth={inventoryTab === "sharps" ? 2.5 : 2} />
                    <span className="text-[14px] font-bold">Sharps & Hazards</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${inventoryTab === "sharps" ? "bg-white/80 shadow-sm" : "bg-gray-100"}`}>0 items</span>
                  </button>
                </div>

                {/* Main Inventory Box */}
                {inventoryTab === "house" ? (
                <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  {/* Inventory Header */}
                  <div className="p-8 flex items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-[#f0f9f1] flex items-center justify-center text-[#145228]">
                        <Package size={28} />
                      </div>
                      <div>
                        <h3 className="text-[20px] font-bold text-[#0f172a]">House Inventory</h3>
                        <p className="text-[14px] text-gray-400 font-medium">Daily-use household items by category</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button className="flex items-center gap-2 text-[14px] font-bold text-gray-500 hover:text-[#145228] transition-colors">
                        <RotateCcw size={18} />
                        Reset to defaults
                      </button>
                      <button className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#145228] text-[#145228] text-[14px] font-bold hover:bg-[#f0f9f1] transition-all">
                        <Plus size={20} strokeWidth={3} />
                        Add Custom Item
                      </button>
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="divide-y divide-gray-50">
                    {[
                      { title: "Bedroom Essentials", icon: <Bed size={22} />, color: "text-[#7c3aed]", bgColor: "bg-purple-50" },
                      { title: "Bathroom Essentials", icon: <Bath size={22} />, color: "text-[#0ea5e9]", bgColor: "bg-sky-50" },
                      { title: "Kitchen Essentials", icon: <Utensils size={22} />, color: "text-[#f59e0b]", bgColor: "bg-amber-50" },
                      { title: "Cleaning Supplies", icon: <Sparkles size={22} />, color: "text-[#059669]", bgColor: "bg-emerald-50" },
                      { title: "Safety Equipment", icon: <ShieldAlert size={22} />, color: "text-[#dc2626]", bgColor: "bg-red-50" },
                      { title: "Maintenance Tools", icon: <Wrench size={22} />, color: "text-[#4b5563]", bgColor: "bg-gray-100" },
                    ].map((item, index) => (
                      <div key={index} className="flex flex-col">
                        <div 
                          onClick={() => setExpandedCategory(expandedCategory === item.title ? null : item.title)}
                          className={`p-7 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group ${expandedCategory === item.title ? 'bg-gray-50/30' : ''}`}
                        >
                          <div className="flex items-center gap-6">
                            <ChevronRight size={20} className={`text-gray-300 group-hover:text-gray-400 transition-all ${expandedCategory === item.title ? 'rotate-90 text-gray-500' : ''}`} />
                            <div className={`p-3 rounded-2xl ${item.bgColor} ${item.color} shadow-sm`}>
                              {item.icon}
                            </div>
                            <span className="text-[16px] font-bold text-[#1e293b]">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {(() => {
                              const categoryItems = formData.inventory[item.title] || {};
                              const totalItems = Object.keys(categoryItems).length;
                              const filledItems = Object.values(categoryItems).filter(v => v.qty && parseInt(v.qty) > 0).length;
                              return (
                                <>
                                  <span className="px-4 py-1.5 rounded-xl bg-gray-50 text-gray-400 text-[12px] font-bold border border-gray-100">{totalItems} items</span>
                                  <div className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[12px] font-bold border border-emerald-100 flex items-center gap-2">
                                    <Check size={16} strokeWidth={3} />
                                    {filledItems}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {expandedCategory === item.title && (
                          <div className="p-8 bg-gray-50/20 border-t border-gray-50">
                            <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr_40px] gap-6 px-4 mb-5">
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Item Name</span>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Required Qty</span>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Location</span>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notes (Optional)</span>
                              <span></span>
                            </div>

                            <div className="space-y-3">
                              {(item.title === "Bedroom Essentials" ? [
                                "Bed Sheets (Queen)", "Pillows", "Pillowcases", "Blankets (Winter)", "Mattress Protectors"
                              ] : item.title === "Bathroom Essentials" ? [
                                "Bath Towels", "Hand Towels", "Bath Mats", "Soap Dispensers", "Toilet Brushes"
                              ] : item.title === "Kitchen Essentials" ? [
                                "Plates (Dinner)", "Bowls", "Drinking Glasses", "Cutlery Sets", "Cooking Pots"
                              ] : item.title === "Cleaning Supplies" ? [
                                "All-Purpose Cleaner", "Disinfectant Wipes", "Mop & Bucket", "Vacuum Bags", "Trash Bags"
                              ] : item.title === "Safety Equipment" ? [
                                "Smoke Detectors", "Fire Extinguisher (ABC)", "Carbon Monoxide Detectors", "First Aid Kit (basic)", "Emergency Flashlights"
                              ] : item.title === "Maintenance Tools" ? [
                                "Screwdriver Set", "Hammer", "Pliers", "Tape Measure", "Light Bulb Spares"
                              ] : []).map((itemName, i) => {
                                  const itemData = formData.inventory[item.title]?.[itemName] || { qty: "", location: "", notes: "" };
                                  
                                  const updateItem = (field, value) => {
                                    setFormData({
                                      ...formData,
                                      inventory: {
                                        ...formData.inventory,
                                        [item.title]: {
                                          ...formData.inventory[item.title],
                                          [itemName]: { ...itemData, [field]: value }
                                        }
                                      }
                                    });
                                  };

                                  return (
                                    <div key={i} className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr_40px] gap-6 p-4 bg-white rounded-2xl border border-gray-100 items-center shadow-sm hover:shadow-md transition-all">
                                      <span className="text-[15px] font-bold text-[#0f172a]">{itemName}</span>
                                      <div className="flex items-center justify-center">
                                        <div className="flex items-center gap-3 p-1 rounded-xl bg-gray-50 border border-gray-100">
                                          <button 
                                            onClick={() => updateItem('qty', Math.max(0, (parseInt(itemData.qty) || 0) - 1).toString())}
                                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-[#145228] shadow-sm transition-all border border-gray-100"
                                          >
                                            <Minus size={14} />
                                          </button>
                                          <input 
                                            type="number"
                                            placeholder="0"
                                            value={itemData.qty}
                                            onChange={(e) => updateItem('qty', e.target.value)}
                                            className="w-12 text-center text-[15px] font-bold text-[#0f172a] bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                          <button 
                                            onClick={() => updateItem('qty', ((parseInt(itemData.qty) || 0) + 1).toString())}
                                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-[#145228] shadow-sm transition-all border border-gray-100"
                                          >
                                            <Plus size={14} />
                                          </button>
                                        </div>
                                      </div>
                                      <input 
                                        type="text" 
                                        placeholder="Location" 
                                        value={itemData.location}
                                        onChange={(e) => updateItem('location', e.target.value)}
                                        className="px-5 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:border-[#145228] focus:bg-white transition-all text-[14px] font-bold text-[#0f172a] placeholder:text-gray-300" 
                                      />
                                      <input 
                                        type="text" 
                                        placeholder="Notes" 
                                        value={itemData.notes}
                                        onChange={(e) => updateItem('notes', e.target.value)}
                                        className="px-5 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:border-[#145228] focus:bg-white transition-all text-[14px] font-bold text-[#0f172a] placeholder:text-gray-300" 
                                      />
                                      <button className="text-gray-300 hover:text-red-500 transition-colors flex justify-center">
                                        <Trash2 size={20} />
                                      </button>
                                    </div>
                                  );
                                })}

                              <button className="w-full py-5 mt-6 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-3 text-[14px] font-bold text-[#145228] hover:bg-[#f0f9f1] hover:border-[#145228]/20 transition-all bg-gray-50/30">
                                <Plus size={20} strokeWidth={2.5} />
                                Add to {item.title}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                ) : inventoryTab === "emergency" ? (
                <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  {/* Emergency Kit Header */}
                  <div className="p-8 flex items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Lock size={28} />
                      </div>
                      <div>
                        <h3 className="text-[20px] font-bold text-[#0f172a]">72-Hour Emergency Kit</h3>
                        <p className="text-[14px] text-gray-400 font-medium">Disaster preparedness for 72 hours of self-sufficiency</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button className="flex items-center gap-2 text-[14px] font-bold text-gray-500 hover:text-[#145228] transition-colors">
                        <RotateCcw size={18} />
                        Reset to defaults
                      </button>
                      <button className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#145228] text-[#145228] text-[14px] font-bold hover:bg-[#f0f9f1] transition-all">
                        <Plus size={20} strokeWidth={3} />
                        Add Custom Item
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="mx-8 my-6 bg-gray-50/80 border border-gray-100 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex-1 px-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">People to Cover</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#0f172a]">{Math.max(1, (parseInt(formData.maxCapacity) || 0) + 1)}</span>
                        <span className="text-[12px] text-gray-400 font-medium">{formData.maxCapacity || 0} capacity + 1 staff min</span>
                      </div>
                    </div>
                    <div className="w-[1px] h-10 bg-gray-200 mx-2"></div>
                    <div className="flex-1 px-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Water Required</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#0f172a]">{12 * Math.max(1, (parseInt(formData.maxCapacity) || 0) + 1)} L</span>
                        <span className="text-[12px] text-gray-400 font-medium">12L × {Math.max(1, (parseInt(formData.maxCapacity) || 0) + 1)} people</span>
                      </div>
                    </div>
                    <div className="w-[1px] h-10 bg-gray-200 mx-2"></div>
                    <div className="flex-1 px-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Meals Required</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#0f172a]">{9 * Math.max(1, (parseInt(formData.maxCapacity) || 0) + 1)}</span>
                        <span className="text-[12px] text-gray-400 font-medium">9 meals × {Math.max(1, (parseInt(formData.maxCapacity) || 0) + 1)} people</span>
                      </div>
                    </div>
                    <div className="w-[1px] h-10 bg-gray-200 mx-2"></div>
                    <div className="flex-1 px-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Days of Coverage</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#0f172a]">3</span>
                        <span className="text-[12px] text-gray-400 font-medium">Provincial standard</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="divide-y divide-gray-50">
                    {[
                      { title: "Water Supply", icon: <Droplets size={22} />, color: "text-[#0ea5e9]", bgColor: "bg-sky-50" },
                      { title: "Food Supply", icon: <Apple size={22} />, color: "text-[#22c55e]", bgColor: "bg-green-50" },
                    ].map((item, index) => (
                      <div key={index} className="flex flex-col">
                        <div 
                          onClick={() => setExpandedKitCategory(expandedKitCategory === item.title ? null : item.title)}
                          className={`p-7 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group ${expandedKitCategory === item.title ? 'bg-gray-50/30' : ''}`}
                        >
                          <div className="flex items-center gap-6">
                            <ChevronRight size={20} className={`text-gray-300 group-hover:text-gray-400 transition-all ${expandedKitCategory === item.title ? 'rotate-90 text-gray-500' : ''}`} />
                            <div className={`p-3 rounded-2xl ${item.bgColor} ${item.color} shadow-sm`}>
                              {item.icon}
                            </div>
                            <span className="text-[16px] font-bold text-[#1e293b]">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {(() => {
                              const categoryItems = formData.emergencyKit[item.title] || {};
                              const totalItems = Object.keys(categoryItems).length;
                              const filledItems = Object.values(categoryItems).filter(v => v.qty && parseInt(v.qty) > 0).length;
                              return (
                                <>
                                  <span className="px-4 py-1.5 rounded-xl bg-gray-50 text-gray-400 text-[12px] font-bold border border-gray-100">{totalItems} items</span>
                                  <div className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[12px] font-bold border border-emerald-100 flex items-center gap-2">
                                    <Check size={16} strokeWidth={3} />
                                    {filledItems}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {expandedKitCategory === item.title && (
                          <div className="p-8 bg-gray-50/20 border-t border-gray-50">
                            <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr_40px] gap-6 px-4 mb-5">
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Item Name</span>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Required Qty</span>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Location</span>
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notes (Optional)</span>
                              <span></span>
                            </div>

                            <div className="space-y-3">
                              {Object.keys(formData.emergencyKit[item.title] || {}).map((itemName, i) => {
                                const itemData = formData.emergencyKit[item.title]?.[itemName] || { qty: "", location: "", notes: "" };
                                
                                const updateKitItem = (field, value) => {
                                  setFormData({
                                    ...formData,
                                    emergencyKit: {
                                      ...formData.emergencyKit,
                                      [item.title]: {
                                        ...formData.emergencyKit[item.title],
                                        [itemName]: { ...itemData, [field]: value }
                                      }
                                    }
                                  });
                                };

                                return (
                                  <div key={i} className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr_40px] gap-6 p-4 bg-white rounded-2xl border border-gray-100 items-center shadow-sm hover:shadow-md transition-all">
                                    <span className="text-[15px] font-bold text-[#0f172a]">{itemName}</span>
                                    <div className="flex items-center justify-center">
                                      <div className="flex items-center gap-3 p-1 rounded-xl bg-gray-50 border border-gray-100">
                                        <button 
                                          onClick={() => updateKitItem('qty', Math.max(0, (parseInt(itemData.qty) || 0) - 1).toString())}
                                          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-[#145228] shadow-sm transition-all border border-gray-100"
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <input 
                                          type="number"
                                          placeholder="0"
                                          value={itemData.qty}
                                          onChange={(e) => updateKitItem('qty', e.target.value)}
                                          className="w-12 text-center text-[15px] font-bold text-[#0f172a] bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button 
                                          onClick={() => updateKitItem('qty', ((parseInt(itemData.qty) || 0) + 1).toString())}
                                          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-[#145228] shadow-sm transition-all border border-gray-100"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder="Location" 
                                      value={itemData.location}
                                      onChange={(e) => updateKitItem('location', e.target.value)}
                                      className="px-5 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:border-[#145228] focus:bg-white transition-all text-[14px] font-bold text-[#0f172a] placeholder:text-gray-300" 
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="Notes" 
                                      value={itemData.notes}
                                      onChange={(e) => updateKitItem('notes', e.target.value)}
                                      className="px-5 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:border-[#145228] focus:bg-white transition-all text-[14px] font-bold text-[#0f172a] placeholder:text-gray-300" 
                                    />
                                    <button className="text-gray-300 hover:text-red-500 transition-colors flex justify-center">
                                      <Trash2 size={20} />
                                    </button>
                                  </div>
                                );
                              })}

                              <button className="w-full py-5 mt-6 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-3 text-[14px] font-bold text-[#145228] hover:bg-[#f0f9f1] hover:border-[#145228]/20 transition-all bg-gray-50/30">
                                <Plus size={20} strokeWidth={2.5} />
                                Add to {item.title}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                ) : (
                <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0f172a] mb-2">Sharps & Hazards</h3>
                  <p className="text-[14px] text-gray-400 font-medium">Coming soon — this section will be available in a future update.</p>
                </div>
                )}
              </div>
            ) : currentStep === 6 ? (
              <div className="max-w-[1000px] w-full mx-auto pb-20">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 6 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-3 tracking-tight">
                  Emergency Preparedness
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-10 leading-relaxed">
                  72-hour emergency kit and contacts. Auto-calculated from your capacity + staff count.
                </p>

                {/* Summary Bar */}
                <div className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm flex items-center justify-between relative overflow-hidden mb-10 border-l-[6px] border-l-[#145228]">
                  <div className="flex-1 px-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">People to Cover</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#0f172a]">—</span>
                      <span className="text-[12px] text-gray-400 font-medium">capacity {formData.maxCapacity || 0} + staff</span>
                    </div>
                  </div>
                  <div className="w-[1px] h-12 bg-gray-100 mx-2"></div>
                  <div className="flex-1 px-8">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Water Required</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#0f172a]">— L</span>
                      <span className="text-[12px] text-gray-400 font-medium">12L × —</span>
                    </div>
                  </div>
                  <div className="w-[1px] h-12 bg-gray-100 mx-2"></div>
                  <div className="flex-1 px-8">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Meals Required</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#0f172a]">—</span>
                      <span className="text-[12px] text-gray-400 font-medium">9 × —</span>
                    </div>
                  </div>
                  <div className="w-[1px] h-12 bg-gray-100 mx-2"></div>
                  <div className="flex-1 px-8">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Days of Coverage</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#0f172a]">3</span>
                      <span className="text-[12px] text-gray-400 font-medium leading-tight">Provincial standard: 72 hours</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contacts */}
                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm mb-8">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wider">Emergency Contacts</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold">Required</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {[
                      { role: "Primary Contact",   placeholder: "First responder contact",       roleColor: "#dc2626", roleBg: "#fef2f2" },
                      { role: "Secondary Contact", placeholder: "Backup emergency contact",       roleColor: "#f59e0b", roleBg: "#fffbeb" },
                      { role: "Medical Liaison",   placeholder: "Medical professional contact",  roleColor: "#3b82f6", roleBg: "#eff6ff" },
                    ].map((contact, idx) => (
                      <div key={idx} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 rounded-lg text-[12px] font-bold" style={{ color: contact.roleColor, backgroundColor: contact.roleBg }}>
                            {contact.role}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[12px] font-bold text-[#374151] mb-2">Full Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Dr. Jane Smith"
                              value={formData.emergencyPreparedness.contacts[idx]?.name || ""}
                              onChange={(e) => {
                                const contacts = [...(formData.emergencyPreparedness.contacts || [])];
                                contacts[idx] = { ...(contacts[idx] || { role: contact.role }), name: e.target.value };
                                setFormData({ ...formData, emergencyPreparedness: { ...formData.emergencyPreparedness, contacts } });
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#145228] text-[13px] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-[#374151] mb-2">Phone</label>
                            <input
                              type="tel"
                              placeholder="e.g. +1 780 555-0100"
                              value={formData.emergencyPreparedness.contacts[idx]?.phone || ""}
                              onChange={(e) => {
                                const contacts = [...(formData.emergencyPreparedness.contacts || [])];
                                contacts[idx] = { ...(contacts[idx] || { role: contact.role }), phone: e.target.value };
                                setFormData({ ...formData, emergencyPreparedness: { ...formData.emergencyPreparedness, contacts } });
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#145228] text-[13px] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-[#374151] mb-2">Email</label>
                            <input
                              type="email"
                              placeholder="e.g. contact@example.com"
                              value={formData.emergencyPreparedness.contacts[idx]?.email || ""}
                              onChange={(e) => {
                                const contacts = [...(formData.emergencyPreparedness.contacts || [])];
                                contacts[idx] = { ...(contacts[idx] || { role: contact.role }), email: e.target.value };
                                setFormData({ ...formData, emergencyPreparedness: { ...formData.emergencyPreparedness, contacts } });
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#145228] text-[13px] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evacuation Plan */}
                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wider">Evacuation Plan</h3>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <div>
                        <span className="text-[14px] font-semibold text-[#374151]">Has a formal evacuation plan on file</span>
                        <p className="text-[12px] text-gray-400 mt-0.5">Required for Alberta licensing compliance</p>
                      </div>
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${formData.emergencyPreparedness.hasEvacuationPlan ? 'bg-[#145228]' : 'bg-gray-200'}`}
                        onClick={() => setFormData({ ...formData, emergencyPreparedness: { ...formData.emergencyPreparedness, hasEvacuationPlan: !formData.emergencyPreparedness.hasEvacuationPlan } })}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.emergencyPreparedness.hasEvacuationPlan ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2">Primary Muster Point</label>
                        <input
                          type="text"
                          placeholder="e.g. Front driveway / Street corner"
                          value={formData.emergencyPreparedness.musterPoint || ""}
                          onChange={(e) => setFormData({ ...formData, emergencyPreparedness: { ...formData.emergencyPreparedness, musterPoint: e.target.value } })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#145228] text-[13px] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2">Backup Muster Point</label>
                        <input
                          type="text"
                          placeholder="e.g. Neighbour's property / Community centre"
                          value={formData.emergencyPreparedness.backupMusterPoint || ""}
                          onChange={(e) => setFormData({ ...formData, emergencyPreparedness: { ...formData.emergencyPreparedness, backupMusterPoint: e.target.value } })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#145228] text-[13px] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : currentStep === 7 ? (
              <div className="max-w-[800px] w-full mx-auto">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#145228] text-[10px] font-bold uppercase tracking-wider mb-6">
                  Step 7 of 7
                </div>
                
                <h1 className="text-3xl font-bold text-[#0f172a] mb-3 tracking-tight">
                  Review & Create
                </h1>
                <p className="text-[#64748b] text-[15px] font-medium mb-10 leading-relaxed">
                  Review everything. Each section can be edited inline.
                </p>

                {/* Final Confirmation Card */}
                <div className="bg-[#f0f9f1]/50 border border-[#145228]/10 rounded-[32px] p-10 flex items-start gap-8 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-[#145228] flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-900/10">
                    <Check size={32} strokeWidth={3} />
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-[20px] font-bold text-[#0f172a]">Ready to create this house?</h3>
                      <p className="text-[15px] text-[#64748b] font-medium leading-relaxed">
                        Once created, this house will appear under Family Treatment Program with all 12 dashboard tabs initialized. You can continue editing any section from the house dashboard at any time.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <label className="flex items-center gap-4 group cursor-pointer">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={formData.reviewSettings.notifyStaff}
                            onChange={(e) => setFormData({
                              ...formData,
                              reviewSettings: { ...formData.reviewSettings, notifyStaff: e.target.checked }
                            })}
                            className="w-6 h-6 rounded-lg border-2 border-gray-200 text-[#145228] focus:ring-[#145228] transition-all cursor-pointer appearance-none checked:bg-[#145228] checked:border-[#145228]"
                          />
                          {formData.reviewSettings.notifyStaff && (
                            <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none" size={14} strokeWidth={4} />
                          )}
                        </div>
                        <span className="text-[15px] font-bold text-[#374151] group-hover:text-[#0f172a] transition-colors">
                          Notify assigned staff via email
                        </span>
                      </label>

                      <label className="flex items-center gap-4 group cursor-pointer">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={formData.reviewSettings.scheduleInspections}
                            onChange={(e) => setFormData({
                              ...formData,
                              reviewSettings: { ...formData.reviewSettings, scheduleInspections: e.target.checked }
                            })}
                            className="w-6 h-6 rounded-lg border-2 border-gray-200 text-[#145228] focus:ring-[#145228] transition-all cursor-pointer appearance-none checked:bg-[#145228] checked:border-[#145228]"
                          />
                          {formData.reviewSettings.scheduleInspections && (
                            <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none" size={14} strokeWidth={4} />
                          )}
                        </div>
                        <span className="text-[15px] font-bold text-[#374151] group-hover:text-[#0f172a] transition-colors">
                          Schedule first compliance inspections starting next week
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Info Tip */}
                <div className="mt-10 p-6 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-4">
                  <div className="text-blue-500 mt-0.5">
                    <Info size={20} />
                  </div>
                  <p className="text-[14px] text-blue-800 font-medium leading-relaxed">
                    By clicking "Create House", you agree that all information provided is accurate to the best of your knowledge and complies with Alberta licensing requirements.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="h-[80px] border-t border-gray-100 flex items-center justify-between px-8 bg-white shrink-0">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          
          <span className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">
            Step {currentStep} of 7
          </span>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleSaveDraftManual}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-[14px] font-bold text-[#374151] hover:bg-gray-50 transition-all"
            >
              Save as Draft
            </button>
            <button 
              onClick={handleContinue}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl bg-[#145228] text-white text-[14px] font-bold shadow-md shadow-[#145228]/20 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95'}`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : currentStep === 7 ? (
                <>
                  <Shield size={18} />
                  Create House
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Client Dialog Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-[#145228]">
                  <UserPlus size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-[16px] font-bold text-[#0f172a]">
                  {editingClient ? "Edit Client Details" : "Add Client to House"}
                </h3>
              </div>
              <button 
                onClick={() => setIsClientModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Form Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[480px]">
              {/* Name */}
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">
                  Client Name <span className="text-[#145228] ml-0.5">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Joseph Tate"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145228]/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                />
              </div>

              {/* Client ID & Age */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-[#374151] mb-2">
                    Client ID <span className="text-[#145228] ml-0.5">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. CVIM-001044"
                    value={clientForm.caseId}
                    onChange={(e) => setClientForm({ ...clientForm, caseId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145228]/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-[#374151] mb-2">
                    Age <span className="text-[#145228] ml-0.5">*</span>
                  </label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 14"
                    value={clientForm.age}
                    onChange={(e) => setClientForm({ ...clientForm, age: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145228]/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Service Type & Room */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[13px] font-bold text-[#374151] mb-2">
                    Service Type
                  </label>
                  <div className="relative">
                    <select
                      value={clientForm.serviceType}
                      onChange={(e) => setClientForm({ ...clientForm, serviceType: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145228]/10 focus:border-[#145228] transition-all text-[14px] bg-white appearance-none"
                    >
                      <option value="Respite">Respite</option>
                      <option value="Family Treatment">Family Treatment</option>
                      <option value="PDD">PDD</option>
                      <option value="Child & Youth">Child & Youth</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#374151] mb-2">
                    Room Number
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. A-101"
                    value={clientForm.room}
                    onChange={(e) => setClientForm({ ...clientForm, room: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145228]/10 focus:border-[#145228] transition-all text-[14px] placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Supervisor Selection */}
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">
                  Supervisor Assignment
                </label>
                <div className="relative">
                  <select
                    value={clientForm.supervisorId}
                    onChange={(e) => setClientForm({ ...clientForm, supervisorId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145228]/10 focus:border-[#145228] transition-all text-[14px] bg-white appearance-none"
                  >
                    <option value="sarah_mitchell">Sarah Mitchell (Sarah M.) - System Default</option>
                    {formData.assignedStaff.map(staff => (
                      <option key={staff.id} value={staff.id.toString()}>
                        {staff.name} ({staff.role || 'Staff'})
                      </option>
                    ))}
                    <option value="">No supervisor assigned</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="px-4.5 py-2.5 rounded-xl text-[14px] font-bold text-gray-500 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveClient}
                className="px-6 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#145228] hover:bg-[#0f3d1e] shadow-md shadow-[#145228]/10 transition-all cursor-pointer"
              >
                {editingClient ? "Save Changes" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Restoration Dialog Modal */}
      {showRestoreDialog && tempDraft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[10000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[460px] rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 text-left p-8">
            <div className="flex flex-col items-center text-center space-y-5">
              {/* Premium Icon Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#145228] flex items-center justify-center shadow-inner">
                <RotateCcw size={32} strokeWidth={2.5} className="animate-spin-slow" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight">
                  Restore Your Progress?
                </h3>
                <p className="text-[14px] text-gray-500 font-medium leading-relaxed px-2">
                  We found an incomplete draft for <span className="font-bold text-[#0f172a]">"{tempDraft.formData?.houseName || 'New House'}"</span>. Would you like to resume where you left off at Step {tempDraft.currentStep}?
                </p>
              </div>

              {/* Draft Info Summary Box */}
              <div className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex justify-between items-center text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Draft Summary</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100/70 text-[#137333] text-[10px] lowercase font-bold font-sans">auto-saved</span>
                </div>
                <div className="divide-y divide-gray-100/60 text-[13px] font-semibold text-[#374151]">
                  {tempDraft.formData?.houseName && (
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-400 font-medium">House Name:</span>
                      <span className="text-[#0f172a] truncate max-w-[200px]">{tempDraft.formData.houseName}</span>
                    </div>
                  )}
                  {tempDraft.formData?.streetAddress && (
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-400 font-medium">Address:</span>
                      <span className="text-[#0f172a] truncate max-w-[200px]">{tempDraft.formData.streetAddress}</span>
                    </div>
                  )}
                  <div className="py-1.5 flex justify-between font-bold">
                    <span className="text-gray-400 font-medium">Saved Step:</span>
                    <span className="text-[#145228] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-[12px]">Step {tempDraft.currentStep} of 7</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full pt-4 flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={handleResumeDraft}
                  className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white bg-[#145228] hover:bg-[#0f3d1e] shadow-lg shadow-[#145228]/10 hover:shadow-[#145228]/20 transition-all cursor-pointer text-center active:scale-[0.99]"
                >
                  Resume Saved Draft
                </button>
                <button 
                  type="button"
                  onClick={handleDiscardDraft}
                  className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-100 transition-all cursor-pointer text-center active:scale-[0.99]"
                >
                  Discard & Start Fresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddHouse;
