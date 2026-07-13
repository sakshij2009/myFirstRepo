import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ClipboardCheck, FileText, Check, X } from "lucide-react";

export default function HROnboardingApprovals() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchForms = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "dev_onboardingForms"));
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    setForms(rows);
    setLoading(false);
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleAction = async (id, action) => {
    await updateDoc(doc(db, "dev_onboardingForms", id), {
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: new Date().toISOString(),
    });
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, status: action === "approve" ? "approved" : "rejected" } : f)));
  };

  const statusStyle = {
    pending: { background: "#fef3c7", color: "#92400e" },
    approved: { background: "#dcfce7", color: "#14532e" },
    rejected: { background: "#fee2e2", color: "#991b1b" },
  };

  if (loading) return <p className="text-sm text-gray-500">Loading onboarding submissions…</p>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck size={18} className="text-gray-500" />
        <h2 className="font-semibold text-lg text-gray-900">Onboarding Approvals</h2>
      </div>

      {forms.length === 0 && <p className="text-sm text-gray-400">No onboarding submissions yet.</p>}

      <ul className="space-y-3">
        {forms.map((form) => (
          <li key={form.id} className="border border-gray-100 rounded-lg p-4 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{form.fullName || "Unnamed applicant"}</p>
              <p className="text-sm text-gray-500">{form.email} · {form.positionAppliedFor || "Position not specified"}</p>
              {form.documentUrls?.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                  <FileText size={12} />
                  {form.documentUrls.length} document{form.documentUrls.length > 1 ? "s" : ""} attached
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className="px-2 py-1 rounded-md text-xs font-semibold capitalize"
                style={statusStyle[form.status] || statusStyle.pending}
              >
                {form.status || "pending"}
              </span>
              {(!form.status || form.status === "pending") && (
                <>
                  <button
                    onClick={() => handleAction(form.id, "approve")}
                    className="p-1.5 rounded-md hover:bg-green-50 text-green-600"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleAction(form.id, "reject")}
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
