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
  { id: '1', name: 'Sarah Mitchell', role: 'Senior Caregiver', experience: '4 yrs', certifications: ['First Aid','CPR','Medication','ASIST'], status: 'Available' },
  { id: '2', name: 'James Park',     role: 'Caregiver',        experience: '2 yrs', certifications: ['First Aid','CPR'], status: 'Available' },
  { id: '3', name: 'Emily Chen',     role: 'Support Worker',   experience: '3 yrs', certifications: ['First Aid','CPR','Medication'], status: 'Available' },
  { id: '4', name: 'Michael Torres', role: 'Senior Caregiver', experience: '6 yrs', certifications: ['First Aid','CPR','Medication','ASIST','Mental Health'], status: 'Available' },
  { id: '5', name: 'Rachel Brown',   role: 'Caregiver',        experience: '1 yr',  certifications: ['First Aid','CPR'], status: 'Available' },
  { id: '6', name: 'David Kim',      role: 'Support Worker',   experience: '5 yrs', certifications: ['First Aid','CPR','Medication','ASIST'], status: 'Available' },
  { id: '7', name: 'Anna Garcia',    role: 'Senior Caregiver', experience: '7 yrs', certifications: ['First Aid','CPR','Medication','ASIST'], status: 'Available' },
  { id: '8', name: 'Tom Anderson',   role: 'Caregiver',        experience: '2 yrs', certifications: ['First Aid','CPR'], status: 'Available' },
];

const getAvatarColor = (name) => {
  const colors = ['#FFCDD2','#F8BBD0','#E1BEE7','#C5CAE9','#BBDEFB','#B2DFDB','#DCEDC8','#FFF9C4'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
const getInitials = (name) => name.split(' ').map(n => n[0]).join('');

const SHIFTS_CONFIG = [
  { id: 'morning', name: 'Morning', time: '8:00 AM – 4:00 PM', color: '#F57C00', minStaff: 2 },
  { id: 'evening', name: 'Evening', time: '4:00 PM – 12:00 AM', color: '#7B1FA2', minStaff: 1 },
  { id: 'night',   name: 'Night',   time: '12:00 AM – 8:00 AM', color: '#3F51B5', minStaff: 1 },
  { id: 'weekend', name: 'Weekend', time: 'Sat–Sun, 8AM – 8PM',  color: '#00897B', minStaff: 2 },
];

const HOUSE_INVENTORY_CATEGORIES = [
  {
    id: 'bedroom', name: 'Bedroom Essentials', icon: 'Bed', color: '#7B1FA2',
    items: [
      { name: 'Bed Sheets (Queen)', qty: 12, location: 'Linen Closet A', notes: '' },
      { name: 'Pillows', qty: 12, location: 'Linen Closet A', notes: '' },
      { name: 'Pillowcases', qty: 24, location: 'Linen Closet A', notes: '' },
      { name: 'Blankets (Winter)', qty: 6, location: 'Linen Closet B', notes: '' },
      { name: 'Mattress Protectors', qty: 6, location: 'Linen Closet A', notes: '' },
    ],
  },
  {
    id: 'bathroom', name: 'Bathroom Essentials', icon: 'Bath', color: '#0277BD',
    items: [
      { name: 'Bath Towels', qty: 18, location: 'Bathroom Storage', notes: '' },
      { name: 'Hand Towels', qty: 12, location: 'Bathroom Storage', notes: '' },
      { name: 'Bath Mats', qty: 3, location: 'Bathroom Storage', notes: '' },
      { name: 'Soap Dispensers', qty: 4, location: 'Bathrooms', notes: '' },
      { name: 'Toilet Brushes', qty: 3, location: 'Bathrooms', notes: '' },
    ],
  },
  {
    id: 'kitchen', name: 'Kitchen Essentials', icon: 'Utensils', color: '#F57C00',
    items: [
      { name: 'Plates (Dinner)', qty: 18, location: 'Kitchen Cabinet A', notes: '' },
      { name: 'Bowls', qty: 18, location: 'Kitchen Cabinet A', notes: '' },
      { name: 'Drinking Glasses', qty: 18, location: 'Kitchen Cabinet B', notes: '' },
      { name: 'Cutlery Sets', qty: 18, location: 'Kitchen Drawer', notes: '' },
      { name: 'Cooking Pots', qty: 6, location: 'Kitchen Storage', notes: '' },
    ],
  },
  {
    id: 'cleaning', name: 'Cleaning Supplies', icon: 'Sparkles', color: '#00897B',
    items: [
      { name: 'All-Purpose Cleaner', qty: 6, location: 'Cleaning Closet', notes: '' },
      { name: 'Disinfectant Wipes', qty: 12, location: 'Cleaning Closet', notes: '' },
      { name: 'Mop & Bucket', qty: 2, location: 'Cleaning Closet', notes: '' },
      { name: 'Vacuum Bags', qty: 10, location: 'Cleaning Closet', notes: '' },
      { name: 'Trash Bags', qty: 100, location: 'Cleaning Closet', notes: '' },
    ],
  },
  {
    id: 'safety', name: 'Safety Equipment', icon: 'ShieldAlert', color: '#C62828',
    items: [
      { name: 'Smoke Detectors', qty: 8, location: 'Ceiling Mounted', notes: '' },
      { name: 'Fire Extinguisher (ABC)', qty: 3, location: 'Kitchen, Hallways', notes: '' },
      { name: 'Carbon Monoxide Detectors', qty: 4, location: 'Near Bedrooms', notes: '' },
      { name: 'First Aid Kit (basic)', qty: 2, location: 'Office, Kitchen', notes: '' },
      { name: 'Emergency Flashlights', qty: 4, location: 'Various Locations', notes: '' },
    ],
  },
  {
    id: 'maintenance', name: 'Maintenance Tools', icon: 'Wrench', color: '#5D4037',
    items: [
      { name: 'Screwdriver Set', qty: 1, location: 'Maintenance Closet', notes: '' },
      { name: 'Hammer', qty: 2, location: 'Maintenance Closet', notes: '' },
      { name: 'Pliers', qty: 2, location: 'Maintenance Closet', notes: '' },
      { name: 'Tape Measure', qty: 1, location: 'Maintenance Closet', notes: '' },
      { name: 'Light Bulb Spares', qty: 24, location: 'Maintenance Closet', notes: '' },
    ],
  },
];

const EMERGENCY_KIT_CATEGORIES = [
  {
    id: 'water', name: 'Water Supply', icon: 'Droplets', color: '#0288D1',
    items: [
      { name: 'Bottled Water (1L)', qty: 84, location: 'Emergency Storage', notes: '', expiry: '' },
      { name: 'Emergency Water Pouches', qty: 20, location: 'Emergency Storage', notes: '', expiry: '' },
      { name: 'Water Purification Tablets', qty: 50, location: 'Emergency Storage', notes: '', expiry: '' },
    ],
  },
  {
    id: 'food', name: 'Food Supply', icon: 'Apple', color: '#388E3C',
    items: [
      { name: 'Ready-to-Eat Meals (MRE)', qty: 63, location: 'Emergency Storage', notes: '', expiry: '' },
      { name: 'Protein Bars', qty: 50, location: 'Emergency Storage', notes: '', expiry: '' },
      { name: 'Canned Vegetables', qty: 30, location: 'Emergency Storage', notes: '', expiry: '' },
      { name: 'Canned Fruits', qty: 30, location: 'Emergency Storage', notes: '', expiry: '' },
    ],
  },
  {
    id: 'emergency-supplies', name: 'Emergency Supplies', icon: 'Package', color: '#FBC02D',
    items: [
      { name: 'Flashlights (LED)', qty: 6, location: 'Emergency Kit', notes: '', expiry: '' },
      { name: 'D-cell Batteries', qty: 24, location: 'Emergency Kit', notes: '', expiry: '' },
      { name: 'Emergency Blankets', qty: 10, location: 'Emergency Kit', notes: '', expiry: '' },
    ],
  },
  {
    id: 'first-aid', name: 'First Aid & Medical', icon: 'Heart', color: '#D32F2F',
    items: [
      { name: 'First Aid Kit (Comprehensive)', qty: 2, location: 'Emergency Kit', notes: '', expiry: '' },
      { name: 'Bandages (Assorted)', qty: 100, location: 'Emergency Kit', notes: '', expiry: '' },
      { name: 'Antiseptic Wipes', qty: 50, location: 'Emergency Kit', notes: '', expiry: '' },
    ],
  },
  {
    id: 'sanitation', name: 'Sanitation', icon: 'Droplets', color: '#00897B',
    items: [
      { name: 'Toilet Paper (12-pack)', qty: 6, location: 'Emergency Storage', notes: '', expiry: '' },
      { name: 'Hand Sanitizer (500ml)', qty: 6, location: 'Emergency Kit', notes: '', expiry: '' },
      { name: 'Garbage Bags (Heavy Duty)', qty: 50, location: 'Emergency Storage', notes: '', expiry: '' },
    ],
  },
];

const SHARPS_ITEMS = [
  { name: 'Needles (18 Gauge)', type: 'Needle', qty: 10, location: 'Locked Med Cabinet A', notes: '' },
  { name: 'Syringes (5ml, capped)', type: 'Needle', qty: 20, location: 'Locked Med Cabinet A', notes: '' },
  { name: 'Lancets (Blood Glucose)', type: 'Needle', qty: 100, location: 'Diabetes Kit (locked)', notes: '' },
  { name: 'EpiPen (Emergency)', type: 'Needle', qty: 2, location: 'Front Office (locked)', notes: '' },
  { name: 'Kitchen Knife Set', type: 'Knife', qty: 6, location: 'Locked Drawer A (Kitchen)', notes: '' },
  { name: 'Utility Razor Blades', type: 'Blade', qty: 10, location: 'Locked Toolbox (Maintenance)', notes: '' },
  { name: 'Scissors (Kitchen / Office Standard)', type: 'Scissor', qty: 4, location: 'Office Drawer + Kitchen Block', notes: '' },
];

const steps = [
  { id: 1, title: "House Details",           description: "Name, address, capacity" },
  { id: 2, title: "Staff Assignment",        description: "Assign at least one staff member" },
  { id: 3, title: "Initial Clients",         description: "Optional · Skip if needed" },
  { id: 4, title: "Compliance Setup",        description: "Inspection schedules & frequencies" },
  { id: 5, title: "Inventory Baseline",      description: "Optional · Skip if needed" },
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
  // Legacy state kept for compatibility
  const [expandedCategory, setExpandedCategory] = useState("Bedroom Essentials");
  const [inventoryTab, setInventoryTab] = useState("house");
  const [expandedKitCategory, setExpandedKitCategory] = useState(null);

  // Step 2 Staff Assignment
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [shiftAssignments, setShiftAssignments] = useState({ morning: [], evening: [], night: [], weekend: [] });
  // Step 3 Initial Clients
  const [wizardClients, setWizardClients] = useState([]);
  // Step 5 Inventory
  const [activeInventorySection, setActiveInventorySection] = useState(0);
  const [expandedInventoryCategories, setExpandedInventoryCategories] = useState({ bedroom: true, water: true });
  const [sharpsConfirmed, setSharpsConfirmed] = useState(false);

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
    complianceSchedules: [
      { id: 1, title: 'Fire Safety Inspection',  frequency: 'Quarterly', enabled: true },
      { id: 2, title: 'Health & Safety Audit',   frequency: 'Monthly',   enabled: true },
      { id: 3, title: 'Medication Audit',        frequency: 'Weekly',    enabled: true },
      { id: 4, title: 'Fire Drill',              frequency: 'Monthly',   enabled: true },
      { id: 5, title: 'Hygiene Inspection',      frequency: 'Weekly',    enabled: true },
      { id: 6, title: 'OHS Inspection',          frequency: 'Bi-weekly', enabled: true },
    ],
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-auto">
      <div
        className="bg-white w-full max-w-[1100px] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", height: "calc(100vh - 32px)", maxHeight: 900, minHeight: 560 }}
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
                      onClick={() => setCurrentStep(step.id)}
                      className="w-full flex items-center gap-3 rounded-lg transition-colors hover:bg-gray-50"
                      style={{ minHeight: 56, padding: '12px 16px', cursor: 'pointer' }}
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden wizard-form-body" style={{ minWidth: 0, backgroundColor: '#FFFFFF', padding: '32px 48px' }}>
            <style>{`
              .wizard-form-body::-webkit-scrollbar { width: 6px; }
              .wizard-form-body::-webkit-scrollbar-thumb { background: #BDBDBD; border-radius: 3px; }
              .wizard-form-body::-webkit-scrollbar-thumb:hover { background: #9E9E9E; }
            `}</style>
            <div style={{ maxWidth: 820, margin: '0 auto' }}>

            {/* Step Badge + Heading + Description shared pattern */}
            {(() => {
              const stepInfo = [
                { title: 'House Details', subtitle: 'Basic information about the property and its capacity.' },
                { title: 'Staff Assignment', subtitle: 'Assign the staff who will operate this house. You can change assignments anytime later.' },
                { title: 'Initial Clients', subtitle: 'Add the residents already living in this house. You can also add clients later from the Clients tab.' },
                { title: 'Compliance Setup', subtitle: "Define inspection cadences. We've pre-filled industry-standard schedules for Alberta licensed group homes — adjust if needed." },
                { title: 'Inventory Baseline', subtitle: "Pre-populate the standard inventory checklist. We'll auto-suggest required quantities based on your house capacity." },
                { title: 'Emergency Preparedness', subtitle: '72-hour emergency kit and contacts. Auto-calculated from your capacity + staff count.' },
                { title: 'Review & Create', subtitle: 'Review everything. Each section can be edited inline.' },
              ];
              const info = stepInfo[currentStep - 1];
              return (
                <div style={{ marginBottom: 24 }}>
                  <div className="inline-flex px-3 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#1D6033', backgroundColor: '#E8F5E9', marginBottom: 12 }}>
                    STEP {currentStep} OF 7
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 600, color: '#212121', marginBottom: 8 }}>{info.title}</h2>
                  <p style={{ fontSize: 14, color: '#616161', marginBottom: 24, maxWidth: 600 }}>{info.subtitle}</p>
                </div>
              );
            })()}

            {currentStep === 1 ? (
              <div>

                {/* Section A: House Identity */}
                <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#424242', marginBottom: 16 }}>HOUSE IDENTITY</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>House Name <span style={{ color: '#1D6033' }}>*</span></label>
                      <input type="text" value={formData.houseName} onChange={(e) => setFormData({...formData, houseName: e.target.value})} placeholder="e.g. Maple Grove House" className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>House Code / Internal ID <span style={{ color: '#1D6033' }}>*</span></label>
                      <input type="text" value={formData.houseCode} onChange={(e) => setFormData({...formData, houseCode: e.target.value.toUpperCase()})} placeholder="XX-NNN" className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }} />
                      <p style={{ fontSize: 12, color: '#757575', marginTop: 4 }}>Used for reports. Format: XX-NNN</p>
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Display Photo</label>
                      <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer group relative overflow-hidden" style={{ borderColor: '#BDBDBD', height: 160, backgroundColor: '#FAFAFA' }}>
                        {photoPreview ? (
                          <div className="absolute inset-0">
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="p-3 rounded-xl bg-white shadow-sm" style={{ color: '#1D6033' }}><Upload size={24} /></div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload size={40} style={{ color: '#9E9E9E', marginBottom: 12 }} />
                            <p style={{ fontSize: 13, color: '#616161' }}>Drop image or <span style={{ color: '#1D6033', textDecoration: 'underline', cursor: 'pointer' }}>browse</span></p>
                            <p style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>PNG/JPG, max 5MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Address */}
                <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#424242', marginBottom: 16 }}>ADDRESS</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Street Address <span style={{ color: '#1D6033' }}>*</span></label>
                      <input type="text" value={formData.streetAddress} onChange={(e) => setFormData({...formData, streetAddress: e.target.value})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>City <span style={{ color: '#1D6033' }}>*</span></label>
                      <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Province</label>
                      <select value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14 }}>
                        <option>Alberta</option>
                        <option>British Columbia</option>
                        <option>Ontario</option>
                        <option>Manitoba</option>
                        <option>Saskatchewan</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Postal Code <span style={{ color: '#1D6033' }}>*</span></label>
                      <input type="text" value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value.toUpperCase()})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Country</label>
                      <select value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14 }}>
                        <option>Canada</option>
                        <option>United States</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section C: Capacity & Layout */}
                <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', padding: 24 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#424242', marginBottom: 16 }}>CAPACITY &amp; LAYOUT</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      {[{ label: 'Maximum Capacity', field: 'maxCapacity' }, { label: 'Total Bedrooms', field: 'totalBedrooms' }, { label: 'Total Bathrooms', field: 'totalBathrooms' }].map((item) => (
                        <div key={item.field}>
                          <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>{item.label} <span style={{ color: '#1D6033' }}>*</span></label>
                          <input type="number" value={formData[item.field]} onChange={(e) => setFormData({...formData, [item.field]: e.target.value})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14, textAlign: 'center' }} min="0" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Total Common Areas</label>
                      <input type="number" value={formData.totalCommonAreas} onChange={(e) => setFormData({...formData, totalCommonAreas: e.target.value})} className="w-full px-3 rounded-lg border focus:outline-none focus:ring-2" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14 }} min="0" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #F5F5F5' }}>
                      <label style={{ fontSize: 14, fontWeight: 500, color: '#424242', flex: 1, cursor: 'pointer' }} onClick={() => setFormData({...formData, hasAccessibility: !formData.hasAccessibility})}>Has accessibility accommodations</label>
                      <button onClick={() => setFormData({...formData, hasAccessibility: !formData.hasAccessibility})} className="relative inline-flex items-center rounded-full transition-colors flex-shrink-0" style={{ width: 40, height: 22, backgroundColor: formData.hasAccessibility ? '#1D6033' : '#BDBDBD' }}>
                        <span className="inline-block rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: formData.hasAccessibility ? 'translateX(20px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #F5F5F5' }}>
                      <label style={{ fontSize: 14, fontWeight: 500, color: '#424242', flex: 1, cursor: 'pointer' }} onClick={() => setFormData({...formData, hasSecuredStorage: !formData.hasSecuredStorage})}>Has secured/locked storage for medications &amp; sharps</label>
                      <button onClick={() => setFormData({...formData, hasSecuredStorage: !formData.hasSecuredStorage})} className="relative inline-flex items-center rounded-full transition-colors flex-shrink-0" style={{ width: 40, height: 22, backgroundColor: formData.hasSecuredStorage ? '#1D6033' : '#BDBDBD' }}>
                        <span className="inline-block rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: formData.hasSecuredStorage ? 'translateX(20px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentStep === 2 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Section A: Available Staff Pool */}
                <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', overflow: 'hidden' }}>
                  <div className="flex items-center justify-between" style={{ height: 56, padding: '0 20px', borderBottom: '1px solid #F5F5F5' }}>
                    <div className="flex items-center gap-3">
                      <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#424242' }}>AVAILABLE STAFF</h3>
                      <div className="px-2 py-1 rounded-xl" style={{ fontSize: 11.5, fontWeight: 500, color: '#1D6033', backgroundColor: '#E8F5E9' }}>{MOCK_STAFF.length} available</div>
                    </div>
                    <div className="relative" style={{ width: 240 }}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 16, height: 16, color: '#9E9E9E' }} />
                      <input type="text" value={staffSearchQuery} onChange={(e) => setStaffSearchQuery(e.target.value)} placeholder="Search by name or role..." className="w-full pl-10 pr-3 rounded-lg border" style={{ height: 32, borderColor: '#BDBDBD', fontSize: 13 }} />
                    </div>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {MOCK_STAFF.filter(s => s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || s.role.toLowerCase().includes(staffSearchQuery.toLowerCase())).map((staff, index) => {
                      const isSelected = selectedStaffIds.includes(staff.id);
                      return (
                        <div key={staff.id} onClick={() => setSelectedStaffIds(isSelected ? selectedStaffIds.filter(id => id !== staff.id) : [...selectedStaffIds, staff.id])} className="flex items-center gap-4 cursor-pointer transition-colors" style={{ height: 64, padding: '0 16px', borderBottom: index < MOCK_STAFF.length - 1 ? '1px solid #F5F5F5' : 'none', backgroundColor: isSelected ? '#F1F8E9' : 'transparent', borderLeft: isSelected ? '2px solid #1D6033' : '2px solid transparent' }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div className="flex items-center justify-center rounded transition-colors" style={{ width: 18, height: 18, border: isSelected ? 'none' : '1.5px solid #BDBDBD', backgroundColor: isSelected ? '#1D6033' : '#FFFFFF' }}>
                            {isSelected && <Check size={12} style={{ color: '#FFFFFF' }} strokeWidth={3} />}
                          </div>
                          <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, backgroundColor: getAvatarColor(staff.name) }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{getInitials(staff.name)}</span>
                          </div>
                          <div className="flex-1">
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{staff.name}</div>
                            <div style={{ fontSize: 12, color: '#757575' }}>{staff.role} · {staff.experience} experience</div>
                          </div>
                          <div className="px-3 py-1 rounded flex items-center gap-1.5" style={{ fontSize: 11.5, fontWeight: 500, color: '#2E7D32', backgroundColor: '#E8F5E9' }}>
                            <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: '#2E7D32' }} />
                            Available
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2" style={{ padding: '12px 20px', borderTop: '1px solid #F5F5F5', backgroundColor: '#FAFAFA' }}>
                    <Info size={14} style={{ color: '#757575' }} />
                    <p style={{ fontSize: 11.5, color: '#757575' }}>Showing {MOCK_STAFF.length} of 24 total staff. 16 staff are already assigned to other houses and not shown here.</p>
                  </div>
                </div>

                {/* Section B: Selected Staff Summary */}
                {selectedStaffIds.length > 0 && (
                  <div className="border rounded-xl" style={{ borderColor: '#C8E6C9', backgroundColor: '#F1F8E9', padding: 16 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D6033' }}>Selected Staff</h3>
                      <div className="px-2 py-0.5 rounded" style={{ fontSize: 11.5, fontWeight: 600, color: '#1D6033', backgroundColor: '#C8E6C9' }}>{selectedStaffIds.length}</div>
                    </div>
                    <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
                      {selectedStaffIds.map(id => {
                        const staff = MOCK_STAFF.find(s => s.id === id);
                        if (!staff) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 px-1 pr-3 rounded-full border" style={{ height: 32, backgroundColor: '#FFFFFF', borderColor: '#C8E6C9' }}>
                            <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 24, height: 24, backgroundColor: getAvatarColor(staff.name) }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>{getInitials(staff.name)}</span>
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#212121' }}>{staff.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedStaffIds(selectedStaffIds.filter(sid => sid !== id)); }}>
                              <X size={12} style={{ color: '#757575' }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {selectedStaffIds.length >= 2 && (
                      <>
                        <div style={{ height: 1, backgroundColor: '#C8E6C9', margin: '12px 0' }} />
                        <div>
                          <label style={{ fontSize: 13, fontWeight: 500, color: '#424242', display: 'block', marginBottom: 6 }}>Designate House Lead <span style={{ color: '#C62828' }}>*</span></label>
                          <select className="w-full px-3 rounded-lg border" style={{ height: 40, borderColor: '#BDBDBD', fontSize: 14, backgroundColor: '#FFFFFF' }}>
                            <option value="">Select a lead...</option>
                            {selectedStaffIds.map(id => {
                              const staff = MOCK_STAFF.find(s => s.id === id);
                              return staff ? <option key={id} value={id}>{staff.name}</option> : null;
                            })}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Section C: Shift Rotation */}
                <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', overflow: 'hidden' }}>
                  <div className="flex items-center justify-between" style={{ height: 56, padding: '0 20px', borderBottom: '1px solid #F5F5F5' }}>
                    <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#424242' }}>SHIFT ROTATION</h3>
                    <button className="flex items-center gap-1" style={{ fontSize: 12, color: '#1D6033' }}>How shifts work <ChevronRight size={12} /></button>
                  </div>
                  <div>
                    {SHIFTS_CONFIG.map((shift, index) => {
                      const ShiftIcon = shift.id === 'morning' ? Sun : shift.id === 'evening' ? CloudMoon : shift.id === 'night' ? Moon : CalendarDays;
                      const assigned = shiftAssignments[shift.id] || [];
                      const coverageMet = assigned.length >= shift.minStaff;
                      return (
                        <div key={shift.id} style={{ padding: '16px 20px', borderBottom: index < SHIFTS_CONFIG.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-3 flex-shrink-0" style={{ width: 180 }}>
                              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, backgroundColor: `${shift.color}20` }}>
                                <ShiftIcon size={16} style={{ color: shift.color }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{shift.name}</div>
                                <div style={{ fontSize: 12, color: '#757575' }}>{shift.time}</div>
                              </div>
                            </div>
                            <div className="flex-1" style={{ minWidth: 0 }}>
                              <div className="border rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap" style={{ minHeight: 40, borderColor: '#BDBDBD', backgroundColor: '#FFFFFF' }}>
                                {assigned.length > 0 ? assigned.map(staffId => {
                                  const staff = MOCK_STAFF.find(s => s.id === staffId);
                                  if (!staff) return null;
                                  return (
                                    <div key={staffId} className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ height: 24, backgroundColor: '#F5F5F5', fontSize: 12 }}>
                                      {staff.name}
                                      <button onClick={() => setShiftAssignments({ ...shiftAssignments, [shift.id]: assigned.filter(id => id !== staffId) })}>
                                        <X size={12} style={{ color: '#757575' }} />
                                      </button>
                                    </div>
                                  );
                                }) : (
                                  <span style={{ fontSize: 13, color: '#9E9E9E' }}>Select staff for this shift...</span>
                                )}
                              </div>
                              {selectedStaffIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {selectedStaffIds.filter(id => !assigned.includes(id)).map(id => {
                                    const staff = MOCK_STAFF.find(s => s.id === id);
                                    return staff ? (
                                      <button key={id} onClick={() => setShiftAssignments({ ...shiftAssignments, [shift.id]: [...assigned, id] })} className="px-2 py-1 rounded border transition-colors" style={{ fontSize: 11, borderColor: '#BDBDBD', backgroundColor: '#FFFFFF', color: '#424242' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}>
                                        + {staff.name}
                                      </button>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-1 rounded flex items-center gap-1.5 flex-shrink-0" style={{ height: 24, backgroundColor: coverageMet ? '#E8F5E9' : '#FFEBEE', fontSize: 11.5, fontWeight: 500, color: coverageMet ? '#2E7D32' : '#C62828', minWidth: 80, justifyContent: 'center' }}>
                              {coverageMet ? <Check size={14} /> : <AlertTriangle size={14} />}
                              {assigned.length}/{shift.minStaff}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-start gap-2" style={{ padding: 12, backgroundColor: '#E3F2FD', borderTop: '1px solid #F5F5F5' }}>
                    <Info size={16} className="shrink-0 mt-0.5" style={{ color: '#1565C0' }} />
                    <p style={{ fontSize: 11.5, color: '#1565C0' }}>💡 Family Forever recommends 24/7 coverage. Staff can be assigned to multiple shifts. Shifts can be edited anytime from the Shift tab.</p>
                  </div>
                </div>

                {/* Section D: Coverage Preview */}
                {(() => {
                  const totalWeeklyCoverage = (shiftAssignments.morning.length * 40) + (shiftAssignments.evening.length * 56) + (shiftAssignments.night.length * 56) + (shiftAssignments.weekend.length * 24);
                  const hasFullCoverage = SHIFTS_CONFIG.every(s => (shiftAssignments[s.id]?.length || 0) >= s.minStaff);
                  return (
                    <div className="border rounded-xl flex items-center gap-4" style={{ borderColor: '#E0E0E0', borderLeft: '3px solid #1D6033', padding: '12px 20px', height: 56 }}>
                      <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, backgroundColor: '#E8F5E9' }}>
                        <BarChart3 size={16} style={{ color: '#1D6033' }} />
                      </div>
                      <div className="flex-1">
                        <span style={{ fontSize: 14, color: '#616161' }}>Total Weekly Coverage: </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#212121' }}>{totalWeeklyCoverage} hours</span>
                        <span style={{ fontSize: 14, color: '#616161' }}> across 4 shifts</span>
                      </div>
                      <div className="px-3 py-1 rounded flex items-center gap-1.5" style={{ fontSize: 11.5, fontWeight: 500, color: hasFullCoverage ? '#2E7D32' : '#F57C00', backgroundColor: hasFullCoverage ? '#E8F5E9' : '#FFF3E0' }}>
                        <Check size={14} />
                        {hasFullCoverage ? 'Full Coverage' : 'Coverage Gap'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : currentStep === 3 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Skip Notice */}
                <div className="border rounded-xl p-4" style={{ borderColor: '#B3D4FC', backgroundColor: '#E3F2FD' }}>
                  <div className="flex items-start gap-3">
                    <Info size={20} className="shrink-0" style={{ color: '#1565C0' }} />
                    <div>
                      <p style={{ fontSize: 14, color: '#424242' }}>No residents yet? You can skip this step and admit clients individually later. Most new houses start empty.</p>
                      <button onClick={() => setCurrentStep(4)} style={{ fontSize: 14, color: '#1565C0', marginTop: 8, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Skip this step →</button>
                    </div>
                  </div>
                </div>

                {/* Clients In This House */}
                <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', padding: 24 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                    <div className="flex items-center gap-3">
                      <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#424242' }}>CLIENTS IN THIS HOUSE</h3>
                      <div className="px-2 py-1 rounded" style={{ fontSize: 11.5, fontWeight: 500, color: formData.assignedClients.length > 0 ? '#1D6033' : '#757575', backgroundColor: formData.assignedClients.length > 0 ? '#E8F5E9' : '#F5F5F5' }}>{formData.assignedClients.length} added</div>
                    </div>
                    {formData.assignedClients.length > 0 && (
                      <button onClick={handleAddClientClick} className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors" style={{ fontSize: 13, fontWeight: 500, backgroundColor: '#1D6033', color: '#FFFFFF' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F6F43')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D6033')}>
                        <Plus size={14} /> Add New Client
                      </button>
                    )}
                  </div>

                  {formData.assignedClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center" style={{ padding: '40px 0' }}>
                      <div className="rounded-full flex items-center justify-center" style={{ width: 64, height: 64, backgroundColor: '#F5F5F5', marginBottom: 16 }}>
                        <UserPlus size={32} style={{ color: '#BDBDBD' }} />
                      </div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: '#212121', marginBottom: 8 }}>No clients added yet</h4>
                      <p style={{ fontSize: 13, color: '#757575', textAlign: 'center', maxWidth: 360, marginBottom: 20 }}>Use the existing Add Client flow to create new client records. Once created, they'll appear here.</p>
                      <button onClick={handleAddClientClick} className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors" style={{ fontSize: 14, fontWeight: 500, backgroundColor: '#1D6033', color: '#FFFFFF' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F6F43')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D6033')}>
                        <Plus size={16} /> Add New Client
                      </button>
                      <button style={{ fontSize: 12, color: '#1565C0', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12 }}>Or browse pending intake requests →</button>
                    </div>
                  ) : (
                    <div>
                      {/* Table Header */}
                      <div className="flex items-center gap-4" style={{ height: 40, padding: '0 16px', backgroundColor: '#FAFAFA', borderBottom: '1px solid #F5F5F5', borderRadius: '8px 8px 0 0' }}>
                        <div style={{ flex: '2', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>Client</div>
                        <div style={{ width: 60, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>Age</div>
                        <div style={{ width: 120, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>Service Type</div>
                        <div style={{ width: 80, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>Room</div>
                        <div style={{ width: 120, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>Supervisor</div>
                        <div style={{ width: 80, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>Actions</div>
                      </div>
                      {formData.assignedClients.map((client, index) => {
                        const serviceColors = { Respite: { bg: '#E8F5E9', text: '#2E7D32' }, Emergency: { bg: '#FFEBEE', text: '#C62828' }, Supervised: { bg: '#F3E5F5', text: '#7B1FA2' } };
                        const svc = serviceColors[client.serviceType] || { bg: '#F5F5F5', text: '#757575' };
                        const initials = client.initials || client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                        const supervisorName = client.supervisor?.name || 'Unassigned';
                        const supervisorInitials = client.supervisor?.initials || supervisorName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                        return (
                          <div key={client.id} className="flex items-center gap-4" style={{ height: 64, padding: '0 16px', borderBottom: index < formData.assignedClients.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
                            <div className="flex items-center gap-3" style={{ flex: '2' }}>
                              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, backgroundColor: client.color || getAvatarColor(client.name) }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>{initials}</span>
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{client.name}</div>
                                <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', color: '#757575' }}>{client.caseId}</div>
                              </div>
                            </div>
                            <div style={{ width: 60, fontSize: 13, color: '#424242' }}>{client.age}</div>
                            <div style={{ width: 120 }}>
                              <div className="px-2 py-1 rounded text-center" style={{ fontSize: 11.5, fontWeight: 500, color: svc.text, backgroundColor: svc.bg }}>{client.serviceType}</div>
                            </div>
                            <div style={{ width: 80, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#424242' }}>{client.room}</div>
                            <div className="flex items-center gap-2" style={{ width: 120 }}>
                              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 20, height: 20, backgroundColor: client.supervisor?.color || getAvatarColor(supervisorName) }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: '#FFFFFF' }}>{supervisorInitials}</span>
                              </div>
                              <span style={{ fontSize: 12.5, color: '#424242' }}>{supervisorName}</span>
                            </div>
                            <div className="flex items-center gap-2" style={{ width: 80 }}>
                              <button onClick={() => handleEditClient(client)} className="rounded flex items-center justify-center transition-colors" style={{ width: 28, height: 28, backgroundColor: 'transparent' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E3F2FD')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                <Pencil size={14} style={{ color: '#1565C0' }} />
                              </button>
                              <button onClick={() => handleDeleteClient(client.id)} className="rounded flex items-center justify-center transition-colors" style={{ width: 28, height: 28, backgroundColor: 'transparent' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFEBEE')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                <Trash2 size={14} style={{ color: '#C62828' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between" style={{ padding: 16, borderTop: '1px solid #F5F5F5', marginTop: 8 }}>
                        <p style={{ fontSize: 12.5, color: '#757575' }}>{formData.assignedClients.length} clients added · {Math.max(0, (Number(formData.maxCapacity) || 6) - formData.assignedClients.length)} beds remaining of {Number(formData.maxCapacity) || 6}</p>
                        <button onClick={handleAddClientClick} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors" style={{ fontSize: 13, fontWeight: 500, color: '#1D6033', borderColor: '#1D6033', backgroundColor: 'transparent' }}>
                          <Plus size={14} /> Add Another Client
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : currentStep === 4 ? (
              <div>
                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 24 }}>
                  {formData.complianceSchedules.map((schedule) => {
                    const iconMap = { 1: ShieldCheck, 2: Heart, 3: Pill, 4: Flame, 5: Sparkles, 6: FileSearch };
                    const colorMap = { 1: '#2E7D32', 2: '#C62828', 3: '#1565C0', 4: '#F57C00', 5: '#00897B', 6: '#7B1FA2' };
                    const Icon = iconMap[schedule.id];
                    const iconColor = colorMap[schedule.id];
                    return (
                      <div key={schedule.id} className="border rounded-xl p-4" style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}>
                        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                          <Icon size={20} style={{ color: iconColor }} />
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#212121' }}>{schedule.title}</div>
                        </div>
                        <select value={schedule.frequency} onChange={(e) => setFormData({ ...formData, complianceSchedules: formData.complianceSchedules.map(s => s.id === schedule.id ? { ...s, frequency: e.target.value } : s) })} className="w-full px-3 rounded-lg border" style={{ height: 36, borderColor: '#BDBDBD', fontSize: 13, marginBottom: 8 }}>
                          <option>Daily</option>
                          <option>Weekly</option>
                          <option>Bi-weekly</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Annually</option>
                        </select>
                        <p style={{ fontSize: 11.5, color: '#757575' }}>Next due: Apr 22, 2026</p>
                      </div>
                    );
                  })}
                </div>
                <div className="border rounded-lg p-3 flex items-start gap-3" style={{ borderColor: '#B3D4FC', backgroundColor: '#E3F2FD' }}>
                  <Info size={16} className="shrink-0" style={{ color: '#1565C0' }} />
                  <p style={{ fontSize: 12.5, color: '#1565C0' }}>💡 These cadences match Alberta Children's Services minimum standards for licensed group homes.</p>
                </div>
              </div>
            ) : currentStep === 5 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Helper Banner */}
                <div className="border rounded-xl p-4 flex items-start gap-3" style={{ borderColor: '#BBDEFB', backgroundColor: '#E3F2FD' }}>
                  <Info size={16} className="shrink-0 mt-0.5" style={{ color: '#1565C0' }} />
                  <p style={{ fontSize: 13, color: '#1565C0' }}>Quantities are auto-suggested based on your <strong>{formData.maxCapacity || 0}-bed capacity</strong>. You can edit any value, remove items you don't need, or add custom items specific to your house.</p>
                </div>

                {/* Section Navigator */}
                <div className="border rounded-lg flex items-center gap-1" style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF', padding: 4, minHeight: 56 }}>
                  {[
                    { icon: Package, label: 'House Inventory', count: `${HOUSE_INVENTORY_CATEGORIES.reduce((s, c) => s + c.items.length, 0)} items`, index: 0 },
                    { icon: Briefcase, label: '72-Hour Emergency Kit', count: `${EMERGENCY_KIT_CATEGORIES.reduce((s, c) => s + c.items.length, 0)} items`, index: 1 },
                    { icon: AlertTriangle, label: 'Sharps & Hazards', count: `${SHARPS_ITEMS.length} items`, index: 2 },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeInventorySection === tab.index;
                    return (
                      <button key={tab.index} onClick={() => setActiveInventorySection(tab.index)} className="flex-1 flex items-center rounded-lg transition-colors" style={{ minHeight: 48, padding: '0 16px', gap: 12, backgroundColor: isActive ? '#E8F5E9' : 'transparent', borderBottom: isActive ? '2px solid #1D6033' : '2px solid transparent' }}>
                        <TabIcon size={18} className="flex-shrink-0" style={{ color: isActive ? '#1D6033' : '#616161' }} />
                        <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#1D6033' : '#616161', whiteSpace: 'nowrap' }}>{tab.label}</span>
                        <div className="px-2 rounded flex-shrink-0" style={{ height: 22, display: 'flex', alignItems: 'center', marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#757575', backgroundColor: '#F5F5F5', whiteSpace: 'nowrap' }}>{tab.count}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Section 1: House Inventory */}
                {activeInventorySection === 0 && (
                  <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between" style={{ height: 64, padding: '0 20px', borderBottom: '1px solid #F5F5F5' }}>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, backgroundColor: '#F1F8E9' }}><Package size={16} style={{ color: '#1D6033' }} /></div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#212121' }}>House Inventory</h3>
                          <p style={{ fontSize: 12, color: '#757575' }}>Daily-use household items by category</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors" style={{ fontSize: 12.5, fontWeight: 500, color: '#1D6033' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F8E9')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <RotateCcw size={14} /> Reset to defaults
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors" style={{ fontSize: 13, fontWeight: 500, color: '#1D6033', borderColor: '#1D6033', height: 32 }}>
                          <Plus size={14} /> Add Custom Item
                        </button>
                      </div>
                    </div>
                    <div>
                      {HOUSE_INVENTORY_CATEGORIES.map((category) => {
                        const isExpanded = expandedInventoryCategories[category.id];
                        const IconMap = { Bed, Bath, Utensils, Sparkles, ShieldAlert, Wrench };
                        const CatIcon = IconMap[category.icon] || Package;
                        return (
                          <div key={category.id}>
                            <button onClick={() => setExpandedInventoryCategories({ ...expandedInventoryCategories, [category.id]: !isExpanded })} className="w-full flex items-center justify-between px-5 transition-colors" style={{ height: 56, borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <div className="flex items-center gap-3">
                                <ChevronRight size={16} style={{ color: '#757575', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                <CatIcon size={20} style={{ color: category.color }} />
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{category.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="px-2 py-0.5 rounded" style={{ fontSize: 11.5, fontWeight: 500, color: '#757575', backgroundColor: '#F5F5F5' }}>{category.items.length} items</div>
                                <div className="px-2 py-0.5 rounded flex items-center gap-1" style={{ fontSize: 11.5, fontWeight: 500, color: '#2E7D32', backgroundColor: '#E8F5E9' }}>
                                  <Check size={12} />{category.items.length}
                                </div>
                              </div>
                            </button>
                            {isExpanded && (
                              <div style={{ backgroundColor: '#FAFAFA', padding: 16 }}>
                                <div className="flex items-center gap-3 px-3" style={{ height: 36, borderBottom: '1px solid #E0E0E0', marginBottom: 4 }}>
                                  <div style={{ flex: '1.3 1 180px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>ITEM NAME</div>
                                  <div style={{ width: 130, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>QTY</div>
                                  <div style={{ width: 200, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>LOCATION</div>
                                  <div style={{ flex: '1 1 160px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>NOTES</div>
                                  <div style={{ width: 40 }} />
                                </div>
                                {category.items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-center gap-3 px-3 rounded transition-colors" style={{ height: 48, backgroundColor: '#FFFFFF', marginBottom: 4 }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}>
                                    <div style={{ flex: '1.3 1 180px', fontSize: 14, fontWeight: 500, color: '#212121', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                    <div className="flex items-center justify-center gap-0" style={{ width: 130 }}>
                                      <button className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: '1px solid #BDBDBD', backgroundColor: '#FFFFFF' }}><Minus size={12} style={{ color: '#757575' }} /></button>
                                      <input type="number" defaultValue={item.qty} readOnly className="text-center rounded border" style={{ width: 60, height: 28, fontSize: 13, fontWeight: 600, borderColor: '#BDBDBD', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }} />
                                      <button className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: '1px solid #BDBDBD', backgroundColor: '#FFFFFF' }}><Plus size={12} style={{ color: '#757575' }} /></button>
                                    </div>
                                    <input type="text" defaultValue={item.location} readOnly className="px-3 rounded border" style={{ width: 200, height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                                    <input type="text" placeholder="—" className="px-3 rounded border" style={{ flex: '1 1 160px', height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                                    <button className="flex items-center justify-center rounded transition-colors" style={{ width: 32, height: 32, backgroundColor: 'transparent' }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFEBEE')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                      <Trash2 size={14} style={{ color: '#BDBDBD' }} />
                                    </button>
                                  </div>
                                ))}
                                <button className="w-full flex items-center justify-center gap-2 rounded transition-all" style={{ height: 36, border: '1.5px dashed #BDBDBD', backgroundColor: 'transparent', marginTop: 8 }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1D6033'; e.currentTarget.style.backgroundColor = '#F1F8E9'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                  <Plus size={14} style={{ color: '#1D6033' }} />
                                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1D6033' }}>Add to {category.name}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 2: 72-Hour Emergency Kit */}
                {activeInventorySection === 1 && (
                  <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between" style={{ height: 64, padding: '0 20px', borderBottom: '1px solid #F5F5F5' }}>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, backgroundColor: '#FFF3E0' }}><Briefcase size={16} style={{ color: '#F57C00' }} /></div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#212121' }}>72-Hour Emergency Kit</h3>
                          <p style={{ fontSize: 12, color: '#757575' }}>Disaster preparedness for 72 hours of self-sufficiency</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded" style={{ fontSize: 12.5, fontWeight: 500, color: '#1D6033' }}><RotateCcw size={14} /> Reset to defaults</button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border" style={{ fontSize: 13, fontWeight: 500, color: '#1D6033', borderColor: '#1D6033', height: 32 }}><Plus size={14} /> Add Custom Item</button>
                      </div>
                    </div>
                    {/* Coverage calculator */}
                    {(() => {
                      const peopleCount = (Number(formData.maxCapacity) || 6) + 1;
                      return (
                        <div className="flex items-center gap-6" style={{ margin: 20, padding: 16, border: '1px solid #E0E0E0', borderRadius: 8 }}>
                          {[
                            { label: 'PEOPLE TO COVER', value: peopleCount, sub: `${formData.maxCapacity || 6} capacity + 1 staff min` },
                            { label: 'WATER REQUIRED', value: `${peopleCount * 12} L`, sub: `12L × ${peopleCount} people` },
                            { label: 'MEALS REQUIRED', value: peopleCount * 9, sub: `9 meals × ${peopleCount} people` },
                            { label: 'DAYS OF COVERAGE', value: 3, sub: 'Provincial standard' },
                          ].map((m, i) => (
                            <div key={i}>
                              <div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>{m.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 600, color: '#212121' }}>{m.value}</div>
                              <div style={{ fontSize: 11, color: '#757575' }}>{m.sub}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div>
                      {EMERGENCY_KIT_CATEGORIES.map((category) => {
                        const isExpanded = expandedInventoryCategories[category.id];
                        const IconMap2 = { Droplets, Apple, Package, Heart };
                        const CatIcon2 = IconMap2[category.icon] || Package;
                        return (
                          <div key={category.id}>
                            <button onClick={() => setExpandedInventoryCategories({ ...expandedInventoryCategories, [category.id]: !isExpanded })} className="w-full flex items-center justify-between px-5 transition-colors" style={{ height: 56, borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <div className="flex items-center gap-3">
                                <ChevronRight size={16} style={{ color: '#757575', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                <CatIcon2 size={20} style={{ color: category.color }} />
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{category.name}</span>
                              </div>
                              <div className="px-2 py-0.5 rounded" style={{ fontSize: 11.5, fontWeight: 500, color: '#757575', backgroundColor: '#F5F5F5' }}>{category.items.length} items</div>
                            </button>
                            {isExpanded && (
                              <div style={{ backgroundColor: '#FAFAFA', padding: 16 }}>
                                <div className="flex items-center gap-3 px-3" style={{ height: 36, borderBottom: '1px solid #E0E0E0', marginBottom: 4 }}>
                                  <div style={{ flex: 1, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#757575' }}>ITEM NAME</div>
                                  <div style={{ width: 90, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#757575' }}>QTY</div>
                                  <div style={{ width: 140, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#757575' }}>EXPIRY DATE</div>
                                  <div style={{ width: 180, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#757575' }}>LOCATION</div>
                                  <div style={{ flex: 1, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#757575' }}>NOTES</div>
                                  <div style={{ width: 40 }} />
                                </div>
                                {category.items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-center gap-3 px-3 rounded" style={{ height: 48, backgroundColor: '#FFFFFF', marginBottom: 4 }}>
                                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#212121' }}>{item.name}</div>
                                    <div className="flex items-center gap-1" style={{ width: 90 }}>
                                      <button className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: '1px solid #BDBDBD', backgroundColor: '#FFFFFF' }}><Minus size={12} style={{ color: '#757575' }} /></button>
                                      <input type="number" defaultValue={item.qty} readOnly className="text-center rounded border" style={{ width: 34, height: 28, fontSize: 13, fontWeight: 600, borderColor: '#BDBDBD' }} />
                                      <button className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: '1px solid #BDBDBD', backgroundColor: '#FFFFFF' }}><Plus size={12} style={{ color: '#757575' }} /></button>
                                    </div>
                                    <input type="date" className="px-3 rounded border" style={{ width: 140, height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                                    <input type="text" defaultValue={item.location} readOnly className="px-3 rounded border" style={{ width: 180, height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                                    <input type="text" placeholder="—" className="px-3 rounded border" style={{ flex: 1, height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                                    <button className="flex items-center justify-center rounded" style={{ width: 32, height: 32, backgroundColor: 'transparent' }}><Trash2 size={14} style={{ color: '#BDBDBD' }} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: Sharps & Hazards */}
                {activeInventorySection === 2 && (
                  <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', borderTop: '4px solid #C62828', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between" style={{ height: 64, padding: '0 20px', borderBottom: '1px solid #F5F5F5' }}>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, backgroundColor: '#FFEBEE' }}><AlertTriangle size={16} style={{ color: '#C62828' }} /></div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#212121' }}>Sharps & Hazardous Items</h3>
                          <p style={{ fontSize: 12, color: '#757575' }}>Strict tracking required. All items here trigger the Sharps Investigation workflow if found missing.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded" style={{ fontSize: 12.5, fontWeight: 500, color: '#1D6033' }}><RotateCcw size={14} /> Reset to defaults</button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border" style={{ fontSize: 13, fontWeight: 500, color: '#C62828', borderColor: '#C62828', height: 32 }}><Plus size={14} /> Add Custom Sharp Item</button>
                      </div>
                    </div>
                    <div className="border rounded-lg" style={{ margin: 20, padding: 16, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: '#C62828', marginBottom: 8 }}>🛑 Provincial Compliance Requirement</h4>
                      <p style={{ fontSize: 12.5, color: '#B71C1C' }}>Every sharp or hazardous item below is auto-tracked. A missing count triggers an immediate <strong>Critical Alert</strong> and starts a Sharps Investigation. Lock these in secure storage and update counts at every shift change.</p>
                    </div>
                    <div style={{ padding: 20 }}>
                      <div className="flex items-center gap-3 px-3" style={{ height: 40, borderBottom: '1px solid #E0E0E0', marginBottom: 4 }}>
                        {['ITEM NAME', 'TYPE', 'EXPECTED QTY', 'STORAGE LOCATION', 'AUTO-TRACK', 'NOTES'].map((h, i) => (
                          <div key={i} style={{ flex: i === 0 || i === 5 ? 1 : undefined, width: i === 1 ? 140 : i === 2 ? 120 : i === 3 ? 200 : i === 4 ? 100 : undefined, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#757575' }}>{h}</div>
                        ))}
                        <div style={{ width: 40 }} />
                      </div>
                      {SHARPS_ITEMS.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 rounded transition-colors" style={{ height: 48, backgroundColor: '#FFFFFF', marginBottom: 4, border: '1px solid #F5F5F5' }}>
                          <div className="flex items-center gap-2" style={{ flex: 1 }}>
                            <AlertTriangle size={12} style={{ color: '#C62828' }} />
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{item.name}</span>
                          </div>
                          <select defaultValue={item.type} className="px-3 rounded border" style={{ width: 140, height: 32, fontSize: 13, borderColor: '#BDBDBD' }}>
                            <option>Needle</option><option>Blade</option><option>Scissor</option><option>Knife</option><option>Razor</option><option>Other</option>
                          </select>
                          <div className="flex items-center gap-1" style={{ width: 120 }}>
                            <button className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: '1px solid #BDBDBD', backgroundColor: '#FFFFFF' }}><Minus size={12} style={{ color: '#757575' }} /></button>
                            <input type="number" defaultValue={item.qty} readOnly className="text-center rounded border" style={{ width: 60, height: 28, fontSize: 13, fontWeight: 600, borderColor: '#BDBDBD' }} />
                            <button className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: '1px solid #BDBDBD', backgroundColor: '#FFFFFF' }}><Plus size={12} style={{ color: '#757575' }} /></button>
                          </div>
                          <input type="text" defaultValue={item.location} readOnly className="px-3 rounded border" style={{ width: 200, height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                          <div className="flex items-center justify-center" style={{ width: 100 }}>
                            <button className="relative inline-flex items-center rounded-full transition-colors flex-shrink-0" style={{ width: 40, height: 22, backgroundColor: '#1D6033' }}>
                              <span className="inline-block rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: 'translateX(20px)', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                            </button>
                          </div>
                          <input type="text" placeholder="—" className="px-3 rounded border" style={{ flex: 1, height: 32, fontSize: 13, borderColor: '#BDBDBD' }} />
                          <button className="flex items-center justify-center rounded" style={{ width: 32, height: 32, backgroundColor: 'transparent' }}><Trash2 size={14} style={{ color: '#BDBDBD' }} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="border rounded-lg" style={{ margin: 20, padding: 16, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={sharpsConfirmed} onChange={(e) => setSharpsConfirmed(e.target.checked)} className="mt-0.5" style={{ width: 18, height: 18, accentColor: '#1D6033' }} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>I confirm all sharps and hazardous items above are stored in <strong>locked, secure storage</strong> accessible only to authorized staff.</p>
                          <p style={{ fontSize: 12, color: '#757575', marginTop: 4 }}>This confirmation is logged with your name and timestamp for audit purposes.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : currentStep === 6 ? (
              <div style={{ paddingBottom: 80 }}>
                {/* 4-Metric Summary Bar */}
                {(() => {
                  const peopleCount = (parseInt(formData.maxCapacity) || 6) + 1;
                  const waterRequired = peopleCount * 12;
                  const mealsRequired = peopleCount * 9;
                  return (
                    <div className="border rounded-xl" style={{ borderColor: '#E0E0E0', borderLeft: '4px solid #1D6033', padding: '24px', marginBottom: '24px' }}>
                      <div className="grid grid-cols-4 gap-6">
                        <div>
                          <div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>PEOPLE TO COVER</div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: '#212121' }}>{peopleCount}</div>
                          <div style={{ fontSize: 11, color: '#757575' }}>capacity {formData.maxCapacity || 6} + 1 staff</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>WATER REQUIRED</div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: '#212121' }}>{waterRequired} L</div>
                          <div style={{ fontSize: 11, color: '#757575' }}>12L × {peopleCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>MEALS REQUIRED</div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: '#212121' }}>{mealsRequired}</div>
                          <div style={{ fontSize: 11, color: '#757575' }}>9 × {peopleCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>DAYS OF COVERAGE</div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: '#212121' }}>3</div>
                          <div style={{ fontSize: 11, color: '#757575' }}>Provincial standard: 72 hours</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
              <div style={{ paddingBottom: 80 }}>
                {/* Ready Banner */}
                <div className="border rounded-xl" style={{ borderColor: '#C8E6C9', backgroundColor: '#F1F8E9', padding: '24px', marginBottom: '24px' }}>
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 48, height: 48, backgroundColor: '#1D6033' }}>
                      <Check size={24} style={{ color: '#FFFFFF' }} strokeWidth={3} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#212121', marginBottom: 8 }}>
                        Ready to create {formData.houseName || 'this house'}?
                      </h3>
                      <p style={{ fontSize: 14, color: '#424242', marginBottom: 16, maxWidth: 480 }}>
                        Once created, this house will appear under Family Treatment Program with all 12 dashboard tabs initialized. You can continue editing any section from the house dashboard at any time.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.reviewSettings.notifyStaff}
                            onChange={(e) => setFormData({ ...formData, reviewSettings: { ...formData.reviewSettings, notifyStaff: e.target.checked } })}
                            style={{ width: 16, height: 16, accentColor: '#1D6033', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 14, color: '#424242' }}>Notify assigned staff via email</span>
                        </label>
                        <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.reviewSettings.scheduleInspections}
                            onChange={(e) => setFormData({ ...formData, reviewSettings: { ...formData.reviewSettings, scheduleInspections: e.target.checked } })}
                            style={{ width: 16, height: 16, accentColor: '#1D6033', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 14, color: '#424242' }}>Schedule first compliance inspections starting next week</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Tip */}
                <div className="flex items-start gap-3 rounded-xl" style={{ padding: '16px', border: '1px solid #BBDEFB', backgroundColor: '#E3F2FD' }}>
                  <Info size={18} style={{ color: '#1565C0', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 13.5, color: '#1565C0' }}>
                    By clicking "Create House", you agree that all information provided is accurate to the best of your knowledge and complies with Alberta licensing requirements.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
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
