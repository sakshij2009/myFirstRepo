import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Mail, X, Users,
} from "lucide-react";

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
  const [inviting, setInviting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersSnap, formsSnap] = await Promise.all([
          getDocs(collection(db, "intakeUsers")),
          getDocs(collection(db, "InTakeForms")),
        ]);
        
        // Filter users by role "parent"
        const fams = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.role?.toLowerCase() === "parent");
        setFamilies(fams);

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

    const encodedEmail = encodeURIComponent(inviteEmail.trim().toLowerCase());
    const continueBase = import.meta.env.VITE_CONTINUE_URL || window.location.origin;
    const actionCodeSettings = {
      url: `${continueBase}/intake-form/login?email=${encodedEmail}&role=parent`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, inviteEmail.trim().toLowerCase(), actionCodeSettings);

      alert(`Invitation link sent to ${inviteEmail}`);
      setShowModal(false);
      setInviteEmail("");
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
    return (
      <div className="flex flex-col h-full bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4 mb-6">
           <button onClick={() => setSelectedRequest(null)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 font-semibold text-sm">
             ← Back
           </button>
           <h2 className="text-xl font-bold">Request from {selectedRequest.submitterName || "Private Family"}</h2>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 p-6 rounded-lg border">
           <pre className="text-xs">{JSON.stringify(selectedRequest, null, 2)}</pre>
           <p className="mt-4 text-gray-500 font-medium italic">Full request review logic can be integrated here.</p>
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
                currentItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50 border-b last:border-0" style={{ borderColor: "#f3f4f6" }}>
                    {activeTab === "Families" ? (
                      <>
                        <td className="px-4 py-4">
                          <span className="font-bold text-sm text-gray-900 block">{item.name || "—"}</span>
                          <span className="text-[11px] text-gray-400 mt-0.5">{item.id.slice(0, 8)}</span>
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
                ))
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
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family@example.com"
                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div
                  className="rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderLeft: "4px solid #1f7a3c",
                    color: "#166534",
                  }}
                >
                  A unique registration link will be sent to the family. They will be registered with the 'Parent' role.
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
