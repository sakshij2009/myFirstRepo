import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const MedicationPage = ({ shiftData }) => {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  const [medications, setMedications] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editIndex, setEditIndex] = useState(null);

  const [formData, setFormData] = useState({
    medicineName: "",
    dosage: "",
    time: "",
    color: "Yellow",
    cautions: "",
    reason: "",
  });

  const [healthcareNumber, setHealthcareNumber] = useState("");

  // 🔹 Fetch healthcare number
  useEffect(() => {
    const fetchHealthcareNumber = async () => {
      if (!shiftData?.name) return;
      try {
        const intakeFormsRef = collection(db, "InTakeForms");
        const snapshot = await getDocs(intakeFormsRef);

        let foundNumber = null;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const clients = data.inTakeClients || [];
          const matchedClient = clients.find(
            (c) =>
              c.name && c.name.toLowerCase() === shiftData.name.toLowerCase()
          );
          if (matchedClient) {
            foundNumber = matchedClient.healthCareNumber || "";
          }
        });

        setHealthcareNumber(foundNumber || "");
      } catch (err) {
        console.error("Error fetching healthcare number:", err);
      }
    };

    fetchHealthcareNumber();
  }, [shiftData?.name]);


   useEffect(() => {
    const fetchMedications = async () => {
      if (!shiftData?.clientId) return;

      try {
        const docRef = doc(db, "medicationRecords", shiftData.clientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const monthKey = `${currentDate.year}-${String(
            currentDate.month + 1
          ).padStart(2, "0")}`;
          if (data.records && data.records[monthKey]) {
            setMedications(data.records[monthKey]);
          } else {
            setMedications({});
          }
        } else {
          setMedications({});
        }
      } catch (err) {
        console.error("Error loading medication data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [shiftData?.clientId, currentDate]);

  // Calendar helpers
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  const daysInMonth = getDaysInMonth(currentDate.month, currentDate.year);
  const firstDayIndex = getFirstDayOfMonth(currentDate.month, currentDate.year);

  // Month navigation
  const handlePrevMonth = () =>
    setCurrentDate((p) =>
      p.month === 0
        ? { month: 11, year: p.year - 1 }
        : { ...p, month: p.month - 1 }
    );

  const handleNextMonth = () =>
    setCurrentDate((p) =>
      p.month === 11
        ? { month: 0, year: p.year + 1 }
        : { ...p, month: p.month + 1 }
    );

  const monthName = new Date(currentDate.year, currentDate.month).toLocaleString(
    "default",
    { month: "long" }
  );

  const isTodayOrPast = (day) =>
    new Date(currentDate.year, currentDate.month, day) <= today;

  // 🔹 Open modal for new or edit
  const handleAddClick = (day) => {
    setSelectedDay(day);
    setFormData({
      medicineName: "",
      dosage: "",
      time: "",
      color: "Yellow",
      cautions: "",
      reason: "",
    });
    setEditIndex(null);
    setShowModal(true);
  };

  const handleEditClick = (day, idx) => {
    const med = medications[day][idx];
    setFormData(med);
    setSelectedDay(day);
    setEditIndex(idx);
    setShowModal(true);
  };

  // 🔹 Add / Update medicine
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.medicineName) return;

    setMedications((prev) => {
      const updated = { ...prev };
      const dayMeds = [...(updated[selectedDay] || [])];

      if (editIndex !== null) {
        dayMeds[editIndex] = { ...formData };
      } else {
        dayMeds.push({ ...formData });
      }

      updated[selectedDay] = dayMeds;
      return updated;
    });

    setShowModal(false);
  };

  const handleDeleteMedicine = (day, idx) => {
    setMedications((prev) => {
      const updated = { ...prev };
      updated[day] = prev[day].filter((_, i) => i !== idx);
      if (updated[day].length === 0) delete updated[day];
      return updated;
    });
  };

  // 🔹 Save to Firestore (on final Submit)
  const handleSaveToFirestore = async () => {
    try {
      if (!shiftData?.id || !shiftData?.clientName) {
        alert("Client info missing!");
        return;
      }

      const docRef = doc(db, "medicationRecords", shiftData.clientId);
      const docSnap = await getDoc(docRef);

      const monthKey = `${currentDate.year}-${String(
        currentDate.month + 1
      ).padStart(2, "0")}`;

      const existingData = docSnap.exists() ? docSnap.data() : {};
      const updatedRecords = {
        ...(existingData.records || {}),  
        [monthKey]: medications,
      };

      await setDoc(
        docRef,
        {
          clientId: shiftData.id,
          clientName: shiftData.clientName,
          healthCareNumber: healthcareNumber || "",
          records: updatedRecords,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      alert("✅ Medication record saved successfully!");
    } catch (err) {
      console.error("Error saving medication:", err);
      alert("❌ Failed to save record.");
    }
  };

  return (
    <div className="flex flex-col bg-white py-3 px-4 rounded gap-4 text-light-black">
      {/* Title */}
      <h1 className="text-center text-[28px] font-bold leading-8 mb-4 ">
        Medication Administration Record
      </h1>

      {/* Header Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ">
        <div className="flex flex-col gap-[6px]">
          <label className=" text-sm leading-[20px] font-semibold">Client Name</label>
          <input
            type="text"
            value={shiftData.clientName}
            placeholder="Please enter the Client Name"
            className="w-full border border-light-gray rounded p-1 placeholder:text-sm"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <label className="text-sm leading-[20px] font-semibold">
            Month/Yr of the Record
          </label>
          <input
            type="text"
            className="w-full border border-light-gray rounded p-1 placeholder:text-sm"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <label className="text-sm leading-[20px] font-semibold">ACH</label>
          <input
            type="text"
            value={healthcareNumber}
            placeholder="Please enter the parent name"
            className="w-full border border-light-gray rounded p-1 placeholder:text-sm"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <label className="text-sm leading-[20px] font-semibold">Doctor’s Name</label>
          <input
            type="text"
            placeholder="Please enter the parent name"
            className="w-full border border-light-gray rounded p-1 placeholder:text-sm"
          />
        </div>
      </div>

      <hr className="border-t border-light-gray" />

      {/* Medication Timing & Type */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-[20px] leading-[24px] ">
          Medication Timing & Type
        </h2>
        <div className="bg-[#EFF6FF] border border-[#D8E9FF] rounded p-[10px]">
          <ul className="text-[12px] leading-[14px] text-[#2F5CE9] space-y-3">
            <li>
              <strong>Amoxicillin (antibiotic)</strong>
              <ul className="list-disc ml-5 font-normal">
                <li>
                  Weeks 1–2: 500 mg every 8 hours for 7 days; complete full course
                  even if symptoms improve; take with light food to reduce nausea.
                </li>
                <li>Timing example: 7:00 AM, 3:00 PM, 11:00 PM</li>
              </ul>
            </li>
            <li>
              <strong>Atorvastatin (cholesterol)</strong>
              <ul className="list-disc ml-5 font-normal">
                <li>
                  Weeks 1–4: 10 mg daily; take consistently in the evening; monitor
                  for muscle aches; avoid grapefruit.
                </li>
                <li>Timing example: 10:00 PM</li>
              </ul>
            </li>
            <li>
              <strong>Metformin (type 2 diabetes)</strong>
              <ul className="list-disc ml-5 font-normal">
                <li>
                  Weeks 1–2: 500 mg twice daily with evening meal to reduce GI upset.
                </li>
                <li>
                  Weeks 3–4: 500 mg once daily with breakfast and dinner if tolerated,
                  per clinician plan.
                </li>
                <li>Timing example: 8:00 AM with breakfast, 8:00 PM with dinner.</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <hr className="border-t border-light-gray" />

      {/* Monthly Medication Calendar */}
      <h2 className="font-bold text-[20px] leading-[24px]">
        Monthly Medication Calendar
      </h2>
      <div className="mb-6">
        <div className="border border-light-gray rounded overflow-hidden">
          {/* Month Header */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-light-gray">
            <button
              onClick={handlePrevMonth}
              className="px-2 py-1 hover:text-black"
            >
              ←
            </button>
            <div className="text-center font-semibold text-sm leading-5">
              {monthName.toUpperCase()} {currentDate.year}
            </div>
            <button
              onClick={handleNextMonth}
              className="px-2 py-1 text-gray-600 hover:text-black"
            >
              →
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 font-bold text-sm leading-5 border-b border-light-gray ">
            {weekDays.map((day) => (
              <div key={day} className="border-r last:border-r-0 text-center border-light-gray py-3">
                {day}
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-7 text-center text-sm">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-light-gray min-h-[80px]" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const showPlus = isTodayOrPast(day);
               const medsForDay = medications[day] || [];

              return (
                <div
                  key={day}
                  className="flex flex-col border-r border-b border-light-gray min-h-[80px] relative p-1"
                >
                  <div className="flex flex-col px-2">
                    <div className="flex justify-between">
                      <div className="flex text-sm font-normal">{day}</div>
                      <div className="flex">
                        {showPlus && (
                        <button
                          onClick={() => handleAddClick(day)}
                          className="flex text-xs font-bold rounded hover:bg-gray-100"
                        >
                          +
                        </button>
                        )}
                      </div>
                    
                    </div>
                   
                    <div className="mt-5 flex flex-col gap-1 items-center">
                  {medsForDay.map((med, idx) => (
                    <div
                      key={idx}
                      
                      className="relative flex items-center justify-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-300 rounded text-xs text-gray-800 w-full text-center"
                      title="Click to edit"
                    >
                      <span className="truncate" onClick={() => handleEditClick(day, idx)}>{med.medicineName}</span>
                      {/* ❌ Delete button */}
                      <button
                        onClick={() => handleDeleteMedicine(day, idx)}
                        className="absolute top-0 right-1 text-red-500 hover:text-red-700 text-sm font-bold"
                        title="Remove medicine"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
  <div className="fixed inset-0 flex items-center justify-center z-50  bg-black/40">
    {/* Modal Container */}
    <div className="flex flex-col bg-white rounded-lg w-[573px] max-h-[85vh] relative gap-3 text-light-black  overflow-hidden my-6">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-[24px] leading-[28px]">
          {editIndex !== null
                  ? `Edit Medicine - Day ${selectedDay}`
                  : `Add Medicine - Day ${selectedDay}`}
        </h2>
        <button
          onClick={() => setShowModal(false)}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Scrollable Form Area */}
      <div className="overflow-y-auto px-5 py-3 space-y-4">
        <div className="text-sm text-[#2F5CE9] border border-[#D8E9FF] p-[10px] rounded">
          This entry records medicines for Day-{selectedDay} and will be visible to the supervisor and the assigned staff member; verify details before submitting.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Medicine Name */}
          <div>
            <label className="text-sm font-semibold">Medicine Name</label>
            <input
              type="text"
              value={formData.medicineName}
              onChange={(e) =>
                setFormData({ ...formData, medicineName: e.target.value })
              }
              placeholder="Enter Medicine Name"
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          {/* Dosage */}
          <div>
            <label className="text-sm font-semibold">Dosage</label>
            <input
              type="text"
              value={formData.dosage}
              onChange={(e) =>
                setFormData({ ...formData, dosage: e.target.value })
              }
              placeholder="e.g., 500mg, 2 tablets"
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-semibold">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-semibold">Color</label>
            <select
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="w-full border border-gray-300 rounded p-2"
            >
              <option>Yellow</option>
              <option>Blue</option>
              <option>Green</option>
              <option>Red</option>
            </select>
          </div>

          {/* Cautions */}
          <div>
            <label className="text-sm font-semibold">Cautions</label>
            <input
              type="text"
              value={formData.cautions}
              onChange={(e) =>
                setFormData({ ...formData, cautions: e.target.value })
              }
              placeholder="Enter any cautions"
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-semibold">
              Reason for Medicines
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Please provide a detailed reason..."
              className="w-full border border-gray-300 rounded p-2 h-28 resize-none"
            />
          </div>
        </form>
      </div>

      {/* Footer Buttons (Sticky) */}
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}


      {/* Footer Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="border rounded-md p-4">
          <h3 className="font-bold mb-2">Administration Codes</h3>
          <p className="text-sm leading-5">
            <span className="font-semibold">Initials:</span> Administered Per Instructions <br />
            <span className="font-semibold">"X":</span> Client not in program <br />
            <span className="font-semibold">"E":</span> Medication Error <br />
            <br />
            <span className="text-xs text-gray-600">
              ** note: E or R requires an incident report **
            </span>
          </p>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="font-bold mb-2">Pharmacy Information</h3>
          <p className="text-sm leading-6">
            <strong>Name:</strong> Dr. Tony Wales <br />
            <strong>Email:</strong> tonywales21@gmail.com <br />
            <strong>Number:</strong> +61-5644327891 <br />
            <strong>Address:</strong> 123, ABC Park
          </p>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="font-bold mb-2">Authorization Administration (Trained)</h3>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Name"
              className="border border-gray-300 rounded-md p-2"
            />
            <input
              type="text"
              placeholder="Credentials"
              className="border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-300">
          Export
        </button>
        <button className="bg-green-600 text-white font-semibold px-6 py-2 rounded hover:bg-green-700" 
         onClick={handleSaveToFirestore}>
          Submit
        </button>
      </div>
    </div>
  );
};

export default MedicationPage;
