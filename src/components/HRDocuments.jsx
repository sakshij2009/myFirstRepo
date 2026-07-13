import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Upload, FileText } from "lucide-react";

export default function HRDocuments() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const snap = await getDocs(collection(db, "dev_users"));
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setEmployees(rows);
    };
    fetchEmployees();
  }, []);

  const selected = employees.find((e) => e.id === selectedId);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `employees/${selectedId}/documents/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "dev_users", selectedId), {
        documents: arrayUnion({ name: file.name, url, uploadedAt: new Date().toISOString() }),
      });
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedId
            ? { ...emp, documents: [...(emp.documents || []), { name: file.name, url, uploadedAt: new Date().toISOString() }] }
            : emp
        )
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-lg text-gray-900 mb-4">Documentation</h2>

      <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 w-64"
      >
        <option value="">Choose an employee…</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>{emp.name || emp.id}</option>
        ))}
      </select>

      {selectedId && (
        <>
          <label className="flex items-center gap-2 w-fit cursor-pointer px-4 py-2 rounded-lg text-sm font-medium mb-4"
            style={{ background: "#1B5E37", color: "#fff" }}>
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload Document"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          <ul className="space-y-2">
            {(selected?.documents || []).length === 0 && (
              <p className="text-sm text-gray-400">No documents uploaded yet.</p>
            )}
            {(selected?.documents || []).map((docItem, i) => (
              <li key={i} className="flex items-center gap-2 text-sm border-b border-gray-100 py-2">
                <FileText size={14} className="text-gray-400" />
                <a href={docItem.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {docItem.name}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
