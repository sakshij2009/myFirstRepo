import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const ShiftReportAccessToggle = ({ shiftId, initialValue }) => {
  const [reportAccess, setReportAccess] = useState(initialValue);

  const handleToggle = async () => {
    const newValue = !reportAccess;
    setReportAccess(newValue);

    try {
      await updateDoc(doc(db, "shifts", shiftId.toString()), {
        reportAccess: newValue,
      });
    } catch (err) {
      console.error("Error updating report access:", err);
      setReportAccess(!newValue);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-light-black font-bold text-sm">Report Access:</span>
      <span className="text-sm text-light-black font-medium">No</span>

      <div
        className={`w-10 h-5 flex items-center rounded-full cursor-pointer transition
          ${reportAccess ? "bg-light-green" : "bg-gray-300"}
        `}
        onClick={handleToggle}
      >
        <div
          className={`h-4 w-4 bg-white rounded-full transform transition
            ${reportAccess ? "translate-x-5" : "translate-x-1"}
          `}
        />
      </div>

      <span className="text-sm text-light-black font-medium">Yes</span>
    </div>
  );
};

export default ShiftReportAccessToggle;
