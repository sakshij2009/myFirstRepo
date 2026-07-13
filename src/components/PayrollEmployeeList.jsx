import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Users } from "lucide-react";
import AvatarWithInitials from "./AvatarInitials";

const fmtC = (v) => (v || v === 0 ? "$" + Number(v).toLocaleString("en-US") : "—");

export default function PayrollEmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      const snap = await getDocs(collection(db, "dev_users"));
      const rows = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "—",
            staffId: data.userId || d.id,
            email: data.email || "—",
            phone: data.phone || "—",
            dayOfJoining: data.dayOfJoining || "—",
            employmentType: data.employmentType || "—",
            salaryPerHour: data.salaryPerHour,
            dailyShiftHours: data.dailyShiftHours,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setEmployees(rows);
      setLoading(false);
    };
    fetchEmployees();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-gray-500" />
        <h2 className="font-semibold text-lg text-gray-900">Employee Details</h2>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading employees…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 font-medium pr-4">Employee</th>
                <th className="py-2 font-medium pr-4">Staff ID</th>
                <th className="py-2 font-medium pr-4">Email</th>
                <th className="py-2 font-medium pr-4">Phone</th>
                <th className="py-2 font-medium pr-4">Day of Joining</th>
                <th className="py-2 font-medium pr-4">Employment Type</th>
                <th className="py-2 font-medium">Pay Rate</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4">
                    <AvatarWithInitials fullName={emp.name === "—" ? emp.staffId : emp.name} />
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{emp.staffId}</td>
                  <td className="py-3 pr-4 text-gray-600">{emp.email}</td>
                  <td className="py-3 pr-4 text-gray-600">{emp.phone}</td>
                  <td className="py-3 pr-4 text-gray-600">{emp.dayOfJoining}</td>
                  <td className="py-3 pr-4 text-gray-600">{emp.employmentType}</td>
                  <td className="py-3 text-gray-900 font-medium">
                    {fmtC(emp.salaryPerHour)}{emp.salaryPerHour ? "/hr" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
