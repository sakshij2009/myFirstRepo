import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const MedicationPage = ({ shiftData,user }) => {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  const [medications, setMedications] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [witnessName, setWitnessName] = useState("");
  const [timeBasedMeds, setTimeBasedMeds] = useState([]);

  const [healthcareNumber, setHealthcareNumber] = useState("");
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [clientMedications, setClientMedications] = useState([]);

  const staffName = shiftData?.name || shiftData?.user || "Unknown Staff";

  useEffect(() => {
    const fetchClientMedicationData = async () => {
      const clientId=shiftData?.clientId || shiftData?.clientDetails.id;
      if (!clientId) return;
      try {
        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          if (clientData.pharmacy) setPharmacyInfo(clientData.pharmacy);
          if (Array.isArray(clientData.medications)) {
            setClientMedications(clientData.medications);
          }
        }
      } catch (error) {
        console.error("Error fetching client medications:", error);
      }
    };

    fetchClientMedicationData();
  }, [shiftData?.clientId || shiftData?.clientDetails.id]);

  useEffect(() => {
  const fetchHealthcareNumber = async () => {
    if (!shiftData?.clientName && !shiftData?.clientDetails.name) return;

    const targetName = (
      shiftData.clientName || shiftData?.clientDetails.name
    )?.trim().toLowerCase();

    if (!targetName) return;

    try {
      const snapshot = await getDocs(collection(db, "InTakeForms"));
      let found = null;

      snapshot.forEach((docSnap) => {
        if (found) return;

        const data = docSnap.data();

        /* ----------------------------------
           1️⃣ NEW FORMAT — medicalInfoList
        ---------------------------------- */
        if (Array.isArray(data.medicalInfoList)) {
          const match = data.medicalInfoList.find(
            (m) =>
              m.clientName?.trim().toLowerCase() === targetName &&
              m.healthCareNo
          );

          if (match?.healthCareNo) {
            found = match.healthCareNo;
            return;
          }
        }

        /* ----------------------------------
           2️⃣ NEW FORMAT — clients MAP
        ---------------------------------- */
        if (data.clients && typeof data.clients === "object") {
          Object.values(data.clients).forEach((c) => {
            if (found) return;

            const name =
              c.fullName || c.name || "";

            if (
              name.trim().toLowerCase() === targetName &&
              c.healthCareNo
            ) {
              found = c.healthCareNo;
            }
          });
        }

        /* ----------------------------------
           3️⃣ OLD FORMAT — inTakeClients ARRAY
        ---------------------------------- */
        if (Array.isArray(data.inTakeClients)) {
          const match = data.inTakeClients.find(
            (c) =>
              c.name?.trim().toLowerCase() === targetName &&
              c.healthCareNumber
          );

          if (match?.healthCareNumber) {
            found = match.healthCareNumber;
            return;
          }
        }

        /* ----------------------------------
           4️⃣ VERY OLD ROOT FIELDS (fallback)
        ---------------------------------- */
        if (
          data.clientName?.trim().toLowerCase() === targetName &&
          data.healthCareNumber
        ) {
          found = data.healthCareNumber;
        }
      });

      setHealthcareNumber(found || "Not Available");
    } catch (err) {
      console.error("Error fetching healthcare number:", err);
      setHealthcareNumber("Error Loading");
    }
  };

  fetchHealthcareNumber();
}, [shiftData?.clientName, shiftData?.name]);


  useEffect(() => {
    const fetchMedications = async () => {
      if (!shiftData?.clientId) return;
      try {
        const docRef = doc(db, "medicationRecords", shiftData.clientId);
        const docSnap = await getDoc(docRef);
        const monthKey = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, "0")}`;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.records && data.records[monthKey]) {
            setMedications(data.records[monthKey]);
          }
        }
      } catch (err) {
        console.error("Error loading medication data:", err);
      }
    };
    fetchMedications();
  }, [shiftData?.clientId, currentDate]);

  // Helper functions for calendar
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  const daysInMonth = getDaysInMonth(currentDate.month, currentDate.year);
  const firstDayIndex = getFirstDayOfMonth(currentDate.month, currentDate.year);

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

  // 🕒 Parse and collect unique times from comma-separated strings
  const uniqueTimes = Array.from(
    new Set(
      clientMedications
        .flatMap((m) =>
          (m.timing || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        )
    )
  );

  // 🎨 Color code helper
  const getTimeColor = (time) => {
    const lower = time.toLowerCase();
    if (lower.includes("a.m") || lower.includes("am")) return "bg-yellow-100 border-yellow-400 text-yellow-800"; // Morning
    if (lower.includes("p.m") || lower.includes("pm")) {
      const hour = parseInt(time);
      if (hour >= 6 && hour < 12) return "bg-purple-100 border-purple-400 text-purple-800"; // Night (6–11 p.m.)
      return "bg-blue-100 border-blue-400 text-blue-800"; // Afternoon
    }
    return "bg-gray-100 border-gray-300 text-gray-800";
  };

  // 🩺 Handle clicking a time on a day cell
  const handleTimeClick = (day, time) => {
    // find all meds that include this time in their timing string
    const medsAtThisTime = clientMedications.filter((m) =>
      (m.timing || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .includes(time.trim().toLowerCase())
    );

    setTimeBasedMeds(medsAtThisTime);
    setSelectedDay(day);
    setSelectedTime(time);
    setWitnessName("");
    setShowModal(true);
  };

  // Toggle medication given
  const toggleMedGiven = (index) => {
    setTimeBasedMeds((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, given: !m.given } : m
      )
    );
  };

  // Save to Firestore
  const handleModalSubmit = async () => {
    if (!selectedDay || !selectedTime) return;

    const updated = { ...medications };
    if (!updated[selectedDay]) updated[selectedDay] = {};
    updated[selectedDay][selectedTime] = timeBasedMeds
      .filter((m) => m.given)
      .map((m) => ({
        medicationName: m.medicationName,
        dosage: m.dosage,
        givenBy: staffName,
        witness: witnessName,
        given: true,
      }));

    setMedications(updated);
    setShowModal(false);
    await handleSaveToFirestore(updated);
  };

  const handleSaveToFirestore = async (updatedMeds = medications) => {
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
        [monthKey]: updatedMeds,
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
            value={shiftData?.clientDetails?.name || shiftData.clientName}
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
            value={`${new Date(currentDate.year, currentDate.month).toLocaleString("default", {
              month: "long",
            })} / ${currentDate.year}`}
            className="w-full border border-light-gray rounded p-1 bg-gray-100 text-gray-700 font-medium"
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
  <h2 className="font-bold text-[20px] leading-[24px]">
    Medication Timing & Type
  </h2>

  <div className="bg-[#EFF6FF] border border-[#D8E9FF] rounded p-[10px]">
    {clientMedications && clientMedications.length > 0 ? (
      <ul className="text-[16px] leading-[14px] text-[#2F5CE9] space-y-3 space-x-3">
        {clientMedications.map((med, index) => (
          <li key={index}>
           <strong>
              {(med.medicationName
                ? med.medicationName
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase())
                : "Unnamed Medication")}
            </strong>

            <ul className="list-disc ml-5 font-normal text-[#2F5CE9] text-[14px] mt-1">
              {med.dosage && (
                <li>
                  <span className="font-semibold">Dosage:</span> {med.dosage}
                </li>
              )}
              {med.timing && (
                <li>
                  <span className="font-semibold">Timing:</span> {med.timing}
                </li>
              )}
              {med.reasonOfMedication && (
                <li>
                  <span className="font-semibold">Reason:</span>{" "}
                  {med.reasonOfMedication}
                </li>
              )}
              {med.cautions && (
                <li>
                  <span className="font-semibold">Cautions:</span>{" "}
                  {med.cautions}
                </li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500 text-sm">
        No medication information available for this client.
      </p>
    )}
  </div>
</div>


      <hr className="border-t border-light-gray" />

       {/* Monthly Medication Calendar */}
      <h2 className="font-bold text-[20px] leading-[24px]">
        Monthly Medication Calendar
      </h2>

      <div className="border border-light-gray rounded overflow-hidden mb-6">
        {/* Month Header */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-light-gray">
          <button onClick={handlePrevMonth}>←</button>
          <div className="font-semibold">
            {monthName.toUpperCase()} {currentDate.year}
          </div>
          <button onClick={handleNextMonth}>→</button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 font-bold text-sm border-b border-light-gray">
          {weekDays.map((d) => (
            <div key={d} className="py-2 text-center border-r last:border-0">
              {d}
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
            const showDay = isTodayOrPast(day);
            const medsForDay = medications[day] || {};

            return (
              <div
                key={day}
                className="flex flex-col border-r border-b border-light-gray min-h-[90px] p-1"
              >
                <div className="flex justify-between">
                  <span>{day}</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  {showDay &&
                    uniqueTimes.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleTimeClick(day, time)}
                        className={`text-xs border rounded px-2 py-1 hover:opacity-80 ${getTimeColor(
                          time
                        )}`}
                      >
                        {time}
                      </button>
                    ))}
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  {Object.entries(medsForDay).map(([time, meds]) => (
                    <div key={time} className="text-[10px] text-green-700">
                      {time}: {meds.map((m) => m.medicationName).join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg w-[500px] p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-bold text-lg">
                Day {selectedDay} - {selectedTime}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-xl">
                ×
              </button>
            </div>

            <div className="space-y-3">
              {timeBasedMeds.map((med, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!med.given}
                    onChange={() => toggleMedGiven(i)}
                  />
                  <span>
                    {med.medicationName} ({med.dosage})
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold">Staff Name</label>
              <input
                type="text"
                value={staffName}
                readOnly
                className="border rounded w-full p-2 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">Witness Name</label>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                className="border rounded w-full p-2"
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
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
          {pharmacyInfo ? 
          <p className="text-sm leading-6">
            <strong>Name:</strong> {pharmacyInfo.pharmacyName || "N/A"} <br />
            <strong>Email:</strong>  {pharmacyInfo.pharmacyEmail || "N/A"}<br />
            <strong>Number:</strong> {pharmacyInfo.pharmacyPhone || "N/A"} <br />
            <strong>Address:</strong> {pharmacyInfo.pharmacyAddress || "N/A"}
          </p> :
          <p className="text-gray-500 text-sm">No pharmacy information found.</p>
          
        } 
          
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
      {user?.role == "admin" ? 
      <div className="flex justify-end gap-3 mt-6">
        <button className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-300">
          Export
        </button>
       
      </div> :
      <div></div>
      }
    </div>
  );
};

export default MedicationPage;
