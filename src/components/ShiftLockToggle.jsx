import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { db } from '../firebase';

const ShiftLockToggle = ({ shiftId, initialValue }) => {
  const [locked, setLocked] = useState(!!initialValue);

  const handleToggle = async () => {
    const newValue = !locked;

    if (newValue) {
      const ok = window.confirm("Are you sure you want to lock this shift for payroll and billing?");
      if (!ok) return;
    }

    setLocked(newValue);

    try {
      await updateDoc(doc(db, "shifts", shiftId.toString()), {
        locked: newValue,
        isRatify: newValue,
        billingStatus: newValue ? "Locked" : "Billable",
      });
    } catch (err) {
      console.error("Error updating shift lock:", err);
      setLocked(!newValue);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-500 font-medium">No</span>
      <div
        className={`w-10 h-5 flex items-center rounded-full cursor-pointer transition ${locked ? "bg-green-700" : "bg-gray-300"}`}
        onClick={handleToggle}
      >
        <div className={`h-4 w-4 bg-white rounded-full transform transition ${locked ? "translate-x-5" : "translate-x-1"}`} />
      </div>
      <span className="text-sm text-gray-500 font-medium">Yes</span>
    </div>
  );
};

export default ShiftLockToggle;
