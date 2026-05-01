import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, addDoc, query, where, updateDoc } from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Mail, X, Users,
} from "lucide-react";
import { getEdmontonToday } from "../utils/dateHelpers";

const ManagePrivateFamilies = () => {
  const [activeTab, setActiveTab] = useState("Families"); // "Families" or "Requests"
  const [search, setSearch] = useState("");
  const [families, setFamilies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPage, setGoToPage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [secondParentEmail, setSecondParentEmail] = useState("");
  const [primaryShowAssessment, setPrimaryShowAssessment] = useState(false);
  const [primaryShowIntakeForm, setPrimaryShowIntakeForm] = useState(false);
  const [secondShowAssessment, setSecondShowAssessment] = useState(false);
  const [secondShowIntakeForm, setSecondShowIntakeForm] = useState(false);
  const [invites, setInvites] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersSnap, formsSnap, invitesSnap] = await Promise.all([
          getDocs(collection(db, "intakeUsers")),
          getDocs(collection(db, "InTakeForms")),
          getDocs(collection(db, "parentInvites")),
        ]);
        
        // Filter users by role "parent"
        const fams = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.role?.toLowerCase() === "parent");
        setFamilies(fams);
        setInvites(invitesSnap.docs.map(d => d.data()));

        // Filter requests by source "private-family"
        const privateReqs = formsSnap.docs
          .map(d => {
            const data = d.data();
            const isPrivate = data.formType === "private" || (!data.intakeworkerName && !data.isCaseWorker);
            
            // Map client names
            let cNames = "—";
            if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
              const names = Object.values(data.clients).map(c => c.fullName || c.name || "").filter(Boolean);
              if (names.length) cNames = names.join(", ");
            } else if (Array.isArray(data.inTakeClients)) {
              const names = data.inTakeClients.map(c => c.name || "").filter(Boolean);
              if (names.length) cNames = names.join(", ");
            } else if (data.childName || data.clientName) {
              cNames = data.childName || data.clientName;
            }

            return { 
              id: d.id, 
              firestoreId: d.id, 
              ...data, 
              isPrivate,
              displayClientNames: cNames,
              displayFamilyName: data.familyName || "—"
            };
          })
          .filter(r => r.isPrivate);
        setRequests(privateReqs);

      } catch (e) {
        console.error("Error fetching private families data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteFamily = async (fam) => {
    if (!window.confirm(`Are you sure you want to delete "${fam.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "intakeUsers", fam.id));
      setFamilies((prev) => prev.filter((f) => f.id !== fam.id));
    } catch (e) {
      console.error("Error deleting family:", e);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      alert("Please enter an email address");
      return;
    }

    const confirmSend = window.confirm(
      `Are you sure you want to send an invitation email to ${inviteEmail.trim().toLowerCase()}? \n\nPlease verify the email address before proceeding.`
    );
    if (!confirmSend) return;

    setInviting(true);

    const primaryEmail = inviteEmail.trim().toLowerCase();
    const encodedEmail = encodeURIComponent(primaryEmail);
    const continueBase = import.meta.env.VITE_CONTINUE_URL || window.location.origin;
    const actionCodeSettings = {
      url: `${continueBase}/intake-form/login?email=${encodedEmail}&role=parent`,
      handleCodeInApp: true,
    };

    try {
      // Save per-parent settings to Firestore before sending invite
      await addDoc(collection(db, "parentInvites"), {
        primaryEmail,
        primaryShowAssessmentLink: primaryShowAssessment,
        primaryShowIntakeFormLink: primaryShowIntakeForm,
        secondParentEmail: secondParentEmail.trim().toLowerCase() || "",
        secondShowAssessmentLink: secondShowAssessment,
        secondShowIntakeFormLink: secondShowIntakeForm,
        createdAt: getEdmontonToday(),
      });

      await sendSignInLinkToEmail(auth, primaryEmail, actionCodeSettings);

      // Also send invite to second parent if provided
      if (secondParentEmail.trim()) {
        const secondEmail = secondParentEmail.trim().toLowerCase();
        const encodedSecond = encodeURIComponent(secondEmail);
        const secondActionCodeSettings = {
          url: `${continueBase}/intake-form/login?email=${encodedSecond}&role=parent`,
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, secondEmail, secondActionCodeSettings);
      }

      const sentTo = secondParentEmail.trim()
        ? `${primaryEmail} and ${secondParentEmail.trim().toLowerCase()}`
        : primaryEmail;
      alert(`Invitation link sent to ${sentTo}`);
      setShowModal(false);
      setInviteEmail("");
      setSecondParentEmail("");
      setPrimaryShowAssessment(false);
      setPrimaryShowIntakeForm(false);
      setSecondShowAssessment(false);
      setSecondShowIntakeForm(false);
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Error sending invite: " + error.message);
    } finally {
      setInviting(false);
    }
  };

  const filtered = activeTab === "Families" 
    ? families.filter(f => !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase()))
    : requests.filter(r => !search || r.displayClientNames?.toLowerCase().includes(search.toLowerCase()) || r.displayFamilyName?.toLowerCase().includes(search.toLowerCase()) || (r.submitterName || "").toLowerCase().includes(search.toLowerCase()));

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const changePage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    setGoToPage("");
  };

  if (selectedRequest) {
    const r = selectedRequest;
    return (
      <div className="flex flex-col h-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest mb-1 block">Request Review</span>
                <h2 className="text-xl font-black text-gray-900">{r.displayFamilyName || "Private Family Request"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Submitted On: {r.submittedDate ? new Date(r.submittedDate).toLocaleDateString() : "--"}</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${r.status?.toLowerCase() === 'new' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-600 border'}`}>
                {r.status || 'New'}
              </span>
           </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-auto pr-4 custom-scrollbar space-y-8">
           {/* Section 1: Shared Case Info */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                 <h3 className="font-bold text-gray-900 tracking-tight">Part A: Case Information</h3>
              </div>
              <div className="grid grid-cols-3 gap-6 bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                 <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Referral Source</label>
                    <p className="text-sm font-semibold text-gray-800">{r.shared?.referralSource || r.referralSource || "—"}</p>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Court Order</label>
                    <p className="text-sm font-semibold text-gray-800">{r.shared?.courtOrder || r.courtOrder || "—"}</p>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Service Required</label>
                    <p className="text-sm font-semibold text-gray-800">{r.shared?.visitType || r.serviceType || "—"}</p>
                 </div>
                 <div className="col-span-3">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Children</label>
                    <div className="flex flex-wrap gap-3">
                       {(r.shared?.children || r.children || []).map((c, i) => (
                         <div key={i} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm min-w-[180px]">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs">{i+1}</div>
                            <div>
                               <p className="text-xs font-black text-gray-900">{c.fullName}</p>
                               <p className="text-[10px] text-gray-500 font-medium">DOB: {c.dob} ({c.age})</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           {/* Section 2: Parties Information */}
           <div className="grid grid-cols-2 gap-8">
              {/* Party A */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    <h3 className="font-bold text-gray-900 tracking-tight">Party A Details</h3>
                 </div>
                 <div className="bg-blue-50/30 border border-blue-100 p-6 rounded-2xl rounded-tr-none space-y-4">
                    <div className="flex items-center gap-4 border-b border-blue-100 pb-4">
                       <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black">A</div>
                       <div>
                          <p className="text-sm font-black text-gray-900">{r.partyA?.fullName || r.applicant?.fullName || r.submitterName || "—"}</p>
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{r.partyA?.relationship || r.applicant?.relationship || "Primary Parent"}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                       <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400 block">Phone</label>
                          <p className="text-xs font-semibold text-gray-800">{r.partyA?.phone || r.applicant?.phone || "—"}</p>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400 block">Email</label>
                          <p className="text-xs font-semibold text-gray-800">{r.partyA_email || r.partyA?.email || r.applicantEmail || "—"}</p>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400 block">Address</label>
                          <p className="text-xs font-semibold text-gray-800 leading-relaxed">{r.partyA?.address || r.applicant?.address || "—"}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Party B */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
                    <h3 className="font-bold text-gray-900 tracking-tight">Party B Details</h3>
                 </div>
                 <div className="bg-purple-50/30 border border-purple-100 p-6 rounded-2xl rounded-tl-none space-y-4">
                    {r.partyB || r.otherGuardian ? (
                      <>
                        <div className="flex items-center gap-4 border-b border-purple-100 pb-4">
                           <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-black">B</div>
                           <div>
                              <p className="text-sm font-black text-gray-900">{r.partyB?.fullName || r.otherGuardian?.fullName || "—"}</p>
                              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">{r.partyB?.relationship || r.otherGuardian?.relationship || "Secondary Parent"}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                           <div>
                              <label className="text-[10px] uppercase font-bold text-gray-400 block">Phone</label>
                              <p className="text-xs font-semibold text-gray-800">{r.partyB?.phone || r.otherGuardian?.phone || "—"}</p>
                           </div>
                           <div>
                              <label className="text-[10px] uppercase font-bold text-gray-400 block">Email</label>
                              <p className="text-xs font-semibold text-gray-800">{r.partyB_email || r.partyB?.email || r.secondaryParentEmail || "—"}</p>
                           </div>
                           <div>
                              <label className="text-[10px] uppercase font-bold text-gray-400 block">Address</label>
                              <p className="text-xs font-semibold text-gray-800 leading-relaxed">{r.partyB?.address || r.otherGuardian?.address || "—"}</p>
                           </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                         <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2">?</div>
                         <p className="text-xs font-bold text-gray-400 uppercase">No Data Submitted</p>
                         <p className="text-[10px] text-gray-300 mt-1">Second party has not filled their section yet.</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Section 3: Payment & Reports */}
           <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-amber-600 rounded-full" />
                    <h3 className="font-bold text-gray-900 tracking-tight">Payment Plan</h3>
                  </div>
                  <div className="bg-amber-50/20 border border-amber-100 p-6 rounded-2xl">
                     <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                        <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">{r.payment?.option || "Single Payor Mode"}</p>
                        <p className="text-sm font-semibold text-gray-800">
                           {r.payment?.option === "Option 1" && `Responsible: ${r.payment.responsibleParty}`}
                           {r.payment?.option === "Option 2" && `Cost Split: ${r.payment.costSplit}`}
                           {r.payment?.option === "Option 3" && `Third Party: ${r.payment.thirdPartyPayer}`}
                           {!r.payment && (r.paymentResponsibility || "Standard")}
                        </p>
                        {r.payment?.billingContact && <p className="text-[10px] text-gray-500 mt-2">Billing Contact: {r.payment.billingContact}</p>}
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                    <h3 className="font-bold text-gray-900 tracking-tight">Reports Disclaimer</h3>
                  </div>
                  <div className="bg-red-50/20 border border-red-100 p-6 rounded-2xl">
                     <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${r.reports?.acknowledged ? 'bg-green-600' : 'bg-gray-200'}`}>
                           {r.reports?.acknowledged && <Check size={12} className="text-white" />}
                        </div>
                        <div>
                           <p className="text-xs font-bold text-gray-700">Report Billing Acknowledged</p>
                           <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Party understands that reports are $40 each and billed separately from visit fees.</p>
                        </div>
                     </div>
                  </div>
               </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t flex justify-end gap-3">
           <button 
             onClick={() => setSelectedRequest(null)}
             className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
           >
             Close
           </button>
           <button 
             className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all active:scale-95"
             onClick={() => window.print()}
           >
             Download Full PDF
           </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f9fafb" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <div>
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: 18, color: "#111827" }}>Private Families</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Manage parent accounts and incoming family service requests
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-semibold transition-all shadow-sm border border-emerald-100"
          onClick={() => setShowModal(!showModal)}
          style={{
            backgroundColor: "#1f7a3c",
            color: "#fff",
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Private Family
        </div>
      </div>

      {/* Tabs & Search */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
           {["Families", "Requests"].map(tab => (
             <button
               key={tab}
               onClick={() => { setActiveTab(tab); setCurrentPage(1); setSearch(""); }}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
             >
               {tab} {tab === "Families" ? `(${families.length})` : `(${requests.length})`}
             </button>
           ))}
        </div>

        <div className="relative" style={{ width: 280 }}>
          <Search
            size={14}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            className="w-full rounded-xl border focus:outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5"
            style={{
              paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, borderColor: "#e5e7eb", color: "#111827",
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {activeTab === "Families" ? (
                  ["Name", "Email", "Phone", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-wider text-gray-500">{h}</th>
                  ))
                ) : (
                  ["Family Name", "Client Name / Names", "Filer", "Service", "Submitted On", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-wider text-gray-500">{h}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                   <td colSpan={10} className="text-center py-20">
                      <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2" />
                      <span className="text-xs text-gray-400 font-medium">Loading data...</span>
                   </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-20" style={{ color: "#9ca3af", fontSize: 13 }}>
                    No {activeTab.toLowerCase()} found
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  let sharedPartner = null;
                  if (activeTab === "Families") {
                    // Find if they are in the same invite
                    const invite = invites.find(inv => 
                      inv.primaryEmail === item.email || inv.secondParentEmail === item.email
                    );
                    if (invite && invite.secondParentEmail) {
                       const partnerEmail = invite.primaryEmail === item.email ? invite.secondParentEmail : invite.primaryEmail;
                       sharedPartner = families.find(f => f.email === partnerEmail);
                       if (!sharedPartner) {
                          sharedPartner = { email: partnerEmail, name: "Unregistered Parent" };
                       }
                    }
                  }
                  return (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50 border-b last:border-0" style={{ borderColor: "#f3f4f6" }}>
                    {activeTab === "Families" ? (
                      <>
                        <td className="px-4 py-4">
                          <span className="font-bold text-sm text-gray-900 block">{item.name || "—"}</span>
                          {sharedPartner && (
                            <span title={`Shared Custody with ${sharedPartner.name || sharedPartner.email}`} className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 tracking-wide">
                              <Users size={10} /> Shared Custody
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                             <Mail size={13} className="text-gray-300" />
                             <span className="text-sm">{item.email || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{item.phone || "—"}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/admin-dashboard/add/update-intakeworker/${item.email}`)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-white hover:border-emerald-200 transition-all text-gray-400 hover:text-emerald-600"
                              title="Edit Account"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteFamily(item)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-100 transition-all text-gray-400 hover:text-red-500"
                              title="Delete Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4">
                           <span className="font-bold text-sm text-gray-900 block">{item.displayFamilyName}</span>
                        </td>
                        <td className="px-4 py-4">
                           <span className="text-sm text-gray-700 block">{item.displayClientNames}</span>
                        </td>
                        <td className="px-4 py-4">
                           <span className="text-sm text-gray-700 block">{item.submitterName || "—"}</span>
                           <span className="text-[10px] text-gray-400 block">{item.parentInfoList?.[0]?.relationShip && `Rel: ${item.parentInfoList[0].relationShip}`}</span>
                        </td>
                        <td className="px-4 py-4">
                           <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] uppercase">
                             {item.serviceType || "—"}
                           </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                           {item.submittedDate ? new Date(item.submittedDate).toLocaleDateString() : (item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "--")}
                        </td>
                        <td className="px-4 py-4">
                           <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${item.status?.toLowerCase() === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                              {item.status || 'New'}
                           </span>
                        </td>
                        <td className="px-4 py-4">
                           <button
                             onClick={() => setSelectedRequest(item)}
                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-gray-400 hover:text-emerald-600"
                             title="Review Request"
                           >
                             <Eye size={13} />
                           </button>
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-6 py-3 bg-white border-t shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronLeft size={15} style={{ color: "#374151" }} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`d-${i}`} style={{ fontSize: 13, color: "#9ca3af", padding: "0 4px" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className="w-8 h-8 rounded-lg font-semibold text-xs transition-colors"
                  style={{
                    backgroundColor: currentPage === p ? "#1f7a3c" : "transparent",
                    color: currentPage === p ? "#fff" : "#374151",
                    border: currentPage === p ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronRight size={15} style={{ color: "#374151" }} />
          </button>
        </div>
      </div>

      {/* ADD PRIVATE FAMILY MODAL */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-50 transition-opacity"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-[450px] p-6 pointer-events-auto">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Add Private Family</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter email to generate registration link</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-4 mb-6">
                {/* Primary Parent */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900">Primary Parent Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="parent1@example.com"
                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                    style={{ fontSize: 13 }}
                  />
                  <div className="flex gap-3 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 px-3 py-2 rounded-lg border border-gray-200 flex-1" style={{ backgroundColor: primaryShowAssessment ? "#fffbeb" : "#f9fafb", borderColor: primaryShowAssessment ? "#fbbf24" : "#e5e7eb" }}>
                      <input type="checkbox" checked={primaryShowAssessment} onChange={e => setPrimaryShowAssessment(e.target.checked)} className="w-4 h-4 accent-amber-600" />
                      Assessment Form
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 px-3 py-2 rounded-lg border border-gray-200 flex-1" style={{ backgroundColor: primaryShowIntakeForm ? "#eff6ff" : "#f9fafb", borderColor: primaryShowIntakeForm ? "#93c5fd" : "#e5e7eb" }}>
                      <input type="checkbox" checked={primaryShowIntakeForm} onChange={e => setPrimaryShowIntakeForm(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                      Intake Form
                    </label>
                  </div>
                </div>

                {/* Second Parent */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900">Second Parent Email <span className="font-normal text-gray-400">(Optional)</span></label>
                  <input
                    type="email"
                    value={secondParentEmail}
                    onChange={(e) => setSecondParentEmail(e.target.value)}
                    placeholder="parent2@example.com"
                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                    style={{ fontSize: 13 }}
                  />
                  {secondParentEmail.trim() && (
                    <div className="flex gap-3 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 px-3 py-2 rounded-lg border border-gray-200 flex-1" style={{ backgroundColor: secondShowAssessment ? "#fffbeb" : "#f9fafb", borderColor: secondShowAssessment ? "#fbbf24" : "#e5e7eb" }}>
                        <input type="checkbox" checked={secondShowAssessment} onChange={e => setSecondShowAssessment(e.target.checked)} className="w-4 h-4 accent-amber-600" />
                        Assessment Form
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 px-3 py-2 rounded-lg border border-gray-200 flex-1" style={{ backgroundColor: secondShowIntakeForm ? "#eff6ff" : "#f9fafb", borderColor: secondShowIntakeForm ? "#93c5fd" : "#e5e7eb" }}>
                        <input type="checkbox" checked={secondShowIntakeForm} onChange={e => setSecondShowIntakeForm(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                        Intake Form
                      </label>
                    </div>
                  )}
                </div>

                <div
                  className="rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderLeft: "4px solid #1f7a3c",
                    color: "#166534",
                  }}
                >
                  A unique registration link will be sent to the primary parent. Both parents will be registered with the 'Parent' role and can access the same family information.
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                   onClick={handleInvite}
                   disabled={inviting}
                   className="px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium transition-all text-sm disabled:opacity-70"
                   style={{ backgroundColor: "#1f7a3c" }}
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ManagePrivateFamilies;
