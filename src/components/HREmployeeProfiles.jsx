import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { UserCircle2 } from "lucide-react";

export default function HREmployeeProfiles() {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      const snap = await getDocs(collection(db, "dev_users"));
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setEmployees(rows);
      setLoading(false);
    };
    fetchEmployees();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading employee profiles…</p>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Employees</h2>
        <ul className="space-y-1">
          {employees.map((emp) => (
            <li key={emp.id}>
              <button
                onClick={() => setSelected(emp)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                style={selected?.id === emp.id ? { background: "#ecfdf5", color: "#065f46", fontWeight: 600 } : { color: "#374151" }}
              >
                {emp.name || emp.id}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <UserCircle2 size={40} />
            <p className="mt-2 text-sm">Select an employee to view their full profile</p>
          </div>
        ) : (
          <div>
            <h2 className="font-semibold text-xl text-gray-900 mb-4">{selected.name}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Staff ID" value={selected.userId} />
              <Field label="Email" value={selected.email} />
              <Field label="Phone" value={selected.phone} />
              <Field label="Gender" value={selected.gender} />
              <Field label="Role" value={selected.role} />
              <Field label="Position" value={selected.position} />
              <Field label="Employment Type" value={selected.employmentType} />
              <Field label="Day of Joining" value={selected.dayOfJoining} />
              <Field label="Address" value={selected.address} />
              <Field label="Emergency Contact" value={selected.emergencyContactName} />
              <Field label="Emergency Contact Phone" value={selected.emergencyContactPhone} />
              <Field label="Health Card Number" value={selected.healthCardNumber} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value || "—"}</dd>
    </div>
  );
}
