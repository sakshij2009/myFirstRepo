import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  BarChart3
} from "lucide-react";

const steps = [
  { id: 1, title: "House Details", description: "Name, address, capacity" },
  { id: 2, title: "Staff Assignment", description: "Assign at least one staff member" },
  { id: 3, title: "Initial Clients", description: "Optional - Skip if needed" },
  { id: 4, title: "Compliance Setup", description: "Inspection schedules & frequencies" },
  { id: 5, title: "Inventory Baseline", description: "Optional - Skip if needed" },
  { id: 6, title: "Emergency Preparedness", description: "72-hour kit & emergency contacts" },
  { id: 7, title: "Review & Confirm", description: "" },
];

const AddHouse = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
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
    assignedClients: [],
    clientSearchQuery: "",
  });
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleContinue = () => {
    if (currentStep < 7) setCurrentStep(currentStep + 1);
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
              <span>Programs</span>
              <span className="text-[10px]">›</span>
              <span>Family Treatment Program</span>
              <span className="text-[10px]">›</span>
              <span className="text-gray-900">New House</span>
            </div>
          </div>
          
          <h2 className="absolute left-1/2 -translate-x-1/2 font-bold text-[#0f172a] text-[16px]">
            Add New House
          </h2>

          <div className="flex items-center gap-4">
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
          <div className="w-[280px] border-r border-gray-50 bg-[#fafafa] p-6 flex flex-col gap-1 overflow-y-auto shrink-0">
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`flex gap-4 p-3 rounded-xl transition-all duration-200 ${
                  currentStep === step.id 
                    ? "bg-white shadow-sm border border-gray-100" 
                    : "opacity-60"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold ${
                  currentStep === step.id 
                    ? "bg-emerald-50 text-[#145228] border border-[#145228]/10" 
                    : currentStep > step.id 
                      ? "bg-[#145228] text-white"
                      : "bg-gray-100 text-gray-500"
                }`}>
                  {currentStep > step.id ? <Check size={16} strokeWidth={3} /> : step.id}
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className={`text-[13px] font-bold ${currentStep === step.id ? "text-[#0f172a]" : "text-gray-500"}`}>
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[11px] font-medium text-gray-400 leading-tight">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#ffffff]">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wider">
                        Available Staff
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#145228] text-[11px] font-bold">
                        {formData.assignedStaff.length} available
                      </span>
                    </div>

                    <div className="relative w-[300px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search by name or role..."
                        value={formData.searchQuery}
                        onChange={(e) => setFormData({...formData, searchQuery: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[13px] placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Staff List Area */}
                  <div className="min-h-[400px] flex flex-col">
                    {formData.assignedStaff.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50/30">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                          <Users size={32} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-[16px] font-bold text-[#0f172a] mb-1">No staff members found</h4>
                        <p className="text-[13px] text-gray-500 font-medium mb-6 text-center max-w-[300px]">
                          Enter a staff member's details or add a new entry to the system.
                        </p>
                        <button 
                          onClick={() => {
                            // Demo: adding a staff member
                            const newStaff = {
                              id: Date.now(),
                              name: "Sarah Mitchell",
                              role: "Senior Caregiver",
                              experience: "4 yrs experience",
                              initials: "SM",
                              color: "#fce7f3" // pink
                            };
                            setFormData({
                              ...formData,
                              assignedStaff: [...formData.assignedStaff, newStaff]
                            });
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] font-bold text-[#145228] shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          <UserPlus size={16} />
                          Add Sample Staff
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {formData.assignedStaff
                          .filter(s => 
                            s.name.toLowerCase().includes(formData.searchQuery.toLowerCase()) ||
                            s.role.toLowerCase().includes(formData.searchQuery.toLowerCase())
                          )
                          .map((staff) => (
                          <div key={staff.id} className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                            <div className="flex items-center gap-6">
                              <input 
                                type="checkbox" 
                                checked={true}
                                readOnly
                                className="w-5 h-5 rounded border-gray-300 text-[#145228] focus:ring-[#145228] transition-all cursor-pointer"
                              />
                              
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[15px] text-gray-600 shadow-sm border border-black/5"
                                  style={{ backgroundColor: staff.color || '#f3f4f6' }}
                                >
                                  {staff.initials || staff.name.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-[15px] font-bold text-[#0f172a]">{staff.name}</h4>
                                  <p className="text-[13px] text-gray-500 font-medium">{staff.role} · {staff.experience}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[12px] font-bold text-[#145228]">Available</span>
                              </div>
                              
                              <button 
                                onClick={() => setFormData({
                                  ...formData,
                                  assignedStaff: formData.assignedStaff.filter(s => s.id !== staff.id)
                                })}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box Footer */}
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">
                      <span className="text-[10px] font-bold">i</span>
                    </div>
                    <p className="text-[12px] text-gray-500 font-medium">
                      Showing {formData.assignedStaff.length} of {formData.assignedStaff.length} total staff. {24 - formData.assignedStaff.length} staff are already assigned to other houses and not shown here.
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
                              const staff = formData.assignedStaff.find(s => s.id.toString() === e.target.value);
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
                            {formData.assignedStaff.map(s => (
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
                              const staff = formData.assignedStaff.find(s => s.id.toString() === e.target.value);
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
                            {formData.assignedStaff.map(s => (
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
                              const staff = formData.assignedStaff.find(s => s.id.toString() === e.target.value);
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
                            {formData.assignedStaff.map(s => (
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
                              const staff = formData.assignedStaff.find(s => s.id.toString() === e.target.value);
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
                            {formData.assignedStaff.map(s => (
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
                
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">
                    Initial Clients
                  </h1>
                  <button 
                    onClick={() => setCurrentStep(4)}
                    className="text-[13px] font-bold text-[#145228] hover:underline"
                  >
                    Skip this step
                  </button>
                </div>
                <p className="text-[#64748b] text-[15px] font-medium mb-10 leading-relaxed">
                  Optional: Select clients who will be initially placed in this house. You can also do this later.
                </p>

                {/* Available Clients Box */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col">
                  {/* Box Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#ffffff]">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wider">
                        Available Clients
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#145228] text-[11px] font-bold">
                        {formData.assignedClients.length} available
                      </span>
                    </div>

                    <div className="relative w-[300px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search by name or case ID..."
                        value={formData.clientSearchQuery}
                        onChange={(e) => setFormData({...formData, clientSearchQuery: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#145228] transition-all text-[13px] placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Clients List Area */}
                  <div className="min-h-[400px] flex flex-col">
                    {formData.assignedClients.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50/30">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                          <Users size={32} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-[16px] font-bold text-[#0f172a] mb-1">No clients found</h4>
                        <p className="text-[13px] text-gray-500 font-medium mb-6 text-center max-w-[300px]">
                          Enter a client's name or case ID to find and assign them to this house.
                        </p>
                        <button 
                          onClick={() => {
                            // Demo: adding a client
                            const newClient = {
                              id: Date.now(),
                              name: "Lucas Kaskamin",
                              caseId: "CASE-2025-001",
                              status: "Active Placement",
                              initials: "LK",
                              color: "#dcfce7" // green
                            };
                            setFormData({
                              ...formData,
                              assignedClients: [...formData.assignedClients, newClient]
                            });
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] font-bold text-[#145228] shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          <UserPlus size={16} />
                          Add Sample Client
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {formData.assignedClients
                          .filter(c => 
                            c.name.toLowerCase().includes(formData.clientSearchQuery.toLowerCase()) ||
                            c.caseId.toLowerCase().includes(formData.clientSearchQuery.toLowerCase())
                          )
                          .map((client) => (
                          <div key={client.id} className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                            <div className="flex items-center gap-6">
                              <input 
                                type="checkbox" 
                                checked={true}
                                readOnly
                                className="w-5 h-5 rounded border-gray-300 text-[#145228] focus:ring-[#145228] transition-all cursor-pointer"
                              />
                              
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[15px] text-gray-600 shadow-sm border border-black/5"
                                  style={{ backgroundColor: client.color || '#f3f4f6' }}
                                >
                                  {client.initials}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-[15px] font-bold text-[#0f172a]">{client.name}</h4>
                                  <p className="text-[13px] text-gray-500 font-medium">ID: {client.caseId}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[12px] font-bold text-[#145228]">Available</span>
                              </div>
                              
                              <button 
                                onClick={() => setFormData({
                                  ...formData,
                                  assignedClients: formData.assignedClients.filter(c => c.id !== client.id)
                                })}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box Footer */}
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">
                      <span className="text-[10px] font-bold">i</span>
                    </div>
                    <p className="text-[12px] text-gray-500 font-medium">
                      Showing {formData.assignedClients.length} of {formData.assignedClients.length} total clients.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#f8fafc] border border-gray-200 text-[14px] font-bold text-[#64748b] hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm"
                  >
                    Skip this step and continue
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="p-4 rounded-full bg-gray-50 mb-4">
                  <Check size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Step {currentStep} Content</h3>
                <p className="text-sm font-medium">This section is currently under development.</p>
              </div>
            )}
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
            <button className="px-6 py-2.5 rounded-xl border border-gray-200 text-[14px] font-bold text-[#374151] hover:bg-gray-50 transition-all">
              Save as Draft
            </button>
            <button 
              onClick={handleContinue}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-[#145228] text-white text-[14px] font-bold hover:opacity-95 shadow-md shadow-[#145228]/20 transition-all"
            >
              {currentStep === 7 ? "Review & Confirm" : "Continue"}
              {currentStep < 7 && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddHouse;
