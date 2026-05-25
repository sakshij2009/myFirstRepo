import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react'
import { db } from '../firebase';

const ShiftLockToggle = ({ shiftId, initialValue }) => {
  const [ratified, setRatified] = useState(initialValue);

  const handleToggle = async () => {
    const newValue = !ratified;
    setRatified(newValue); // instant UI

    try {
      await updateDoc(doc(db, "shifts", shiftId.toString()), {
        isRatify: newValue,
      });
    } catch (err) {
      console.error("Error updating shift:", err);
      setRatified(!newValue); // rollback UI
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-light-black font-bold text-sm">Shift Lock:</span>

      <span className="text-sm text-light-black font-medium">No</span>

      <div
        className={`w-10 h-5 flex items-center rounded-full cursor-pointer transition
          ${ratified ? "bg-light-green" : "bg-gray-300"}
        `}
        onClick={handleToggle}
      >
        <div
          className={`h-4 w-4 bg-white rounded-full transform transition
            ${ratified ? "translate-x-5" : "translate-x-1"}
          `}
        />
      </div>

      <span className="text-sm text-light-black font-medium">Yes</span>
    </div>
  );
};


export default ShiftLockToggle
