import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import ActionCard from "./ActionCard";
import CriticalIncidentForm from "./CriticalIncidentForm";
import NoteworthyIncidentForm from "./NoteworthyIncidentForm";
import FollowThroughForm from "./FollowThroughForm";
import MedicalLogForm from "./MedicalLogForm";

const ReportsSection = ({ shiftId, shiftData,user }) => {
  const [text, setText] = useState("");
  const [showForm, setShowForm] = useState(null);
  const minWords = 1000;

  // ✅ Initialize with report from props (editable)
  useEffect(() => {
    if (shiftData?.shiftReport) {
      setText(shiftData.shiftReport);
    }
  }, [shiftData]);

  // ✅ Restore draft if exists
  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${shiftId}`);
    if (savedDraft) setText(savedDraft);
  }, [shiftId]);

  const handleChange = (e) => setText(e.target.value);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isTooShort = wordCount < minWords;

  // ✅ Calculate total hours between clockIn and clockOut
  const calculateHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return "—";
    try {
      const start = clockIn.toDate ? clockIn.toDate() : new Date(clockIn);
      const end = clockOut.toDate ? clockOut.toDate() : new Date(clockOut);
      const diffMs = end - start;
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours.toFixed(2);
    } catch (error) {
      console.error("Error calculating hours:", error);
      return "—";
    }
  };

  // ✅ Save as draft (local only)
  const handleSaveDraft = () => {
    localStorage.setItem(`draft_${shiftId}`, text);
    alert("Draft saved locally!");
  };

  // ✅ Submit and update Firestore
  const handleSubmit = async () => {
    if (isTooShort) {
      alert(`Please write at least ${minWords} words before submitting.`);
      return;
    }

    try {
      const shiftRef = doc(db, "shifts", shiftId);
      await updateDoc(shiftRef, { shiftReport: text });
      alert("Report submitted successfully!");
      localStorage.removeItem(`draft_${shiftId}`);
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Failed to save report. Please try again.");
    }
  };

  // Format time like "08:59 AM"
const formatTime = (timestamp, timeZone = "UTC") => {
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone, // 👈 this ensures we use the given timezone
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "—";
  }
};



  const actions = [
    {
      title: "Critical Incident Reporting",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Report Critical Incident",
      onlyUseWhen:"Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "red",
      type: "critical",
    },
    {
      title: "Contact Note",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Contact Note",
       onlyUseWhen:"Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "blue",
      type: "contact",
    },
    {
      title: "Noteworthy Event",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Noteworthy Event",
       onlyUseWhen:"Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "orange",
      type: "noteworthy",
    },
    {
      title: "Follow Through",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Follow Through",
      onlyUseWhen:"Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "green",
      type: "follow"
    },
  ];

  


  return (
    <>

       {/* Show selected form if any */}
    {showForm === "critical" && (
      <CriticalIncidentForm
        clientData={shiftData}
         shiftId={shiftId}
        onCancel={() => setShowForm(null)}
        onSuccess={() => setShowForm(null)}
        user={user}
      />
    )}

    {showForm === "contact" && (
      <MedicalLogForm
        clientData={shiftData}
         shiftId={shiftId}
        onCancel={() => setShowForm(null)}
        onSuccess={() => setShowForm(null)}
         user={user}
      />
    )}

    {showForm === "noteworthy" && (
      <NoteworthyIncidentForm
        clientData={shiftData}
        shiftId={shiftId}
        onCancel={() => setShowForm(null)}
        onSuccess={() => setShowForm(null)}
         user={user}
      />
    )}

    {showForm === "follow" && (
      <FollowThroughForm
        clientData={shiftData}
         shiftId={shiftId}
        onCancel={() => setShowForm(null)}
        onSuccess={() => setShowForm(null)}
         user={user}
      />
    )}
    
   { !showForm &&  <div className="flex flex-col gap-4 text-light-black">
      {/* Report Section */}
      <div className="flex flex-col bg-white rounded py-3 px-4 gap-4">
        <div className="flex">
          <p className="font-bold text-[28px] leading-[32px]">Shift Report</p>
        </div>

        {/* Report Info */}
        <div className="flex flex-wrap items-center text-sm gap-6">
          <div>
            <span className="font-semibold">Date:</span> {shiftData.startDate}
          </div>
          <div>
            <span className="font-semibold">Staff Name:</span> {shiftData.name}
          </div>
          <div>
            <span className="font-semibold">Staff ID:</span> {shiftData.userId}
          </div>
          <div className="truncate w-[200px]" title={shiftData.clientName}>
            <span className="font-semibold" >Client Name:</span> {shiftData.clientName}
          </div>
          <div>
            <span className="font-semibold">Shift Time:</span> {shiftData.startTime} - {shiftData.endTime}
          </div>
        </div>

        <div><hr className="border-t border-gray" /></div>

        {/* Shift Timeline */}
        <div className="flex flex-col">
          <p className="font-bold text-[16px] leading-[24px]">Shift Timeline</p>
          <div className="flex gap-6 flex-wrap">
            <div className="flex gap-1">
              <p className="font-normal text-[14px]">Clock In:</p>
              <p className="font-bold text-[14px]">{shiftData.clockIn
        ? formatTime(shiftData.clockIn)
        : "—"}</p>
            </div>
            <div className="flex gap-1">
              <p className="font-normal text-[14px]">Clock Out:</p>
              <p className="font-bold text-[14px]"> {shiftData.clockOut
        ? formatTime(shiftData.clockOut)
        : "—"}</p>
            </div>
            <div className="flex gap-1">
              <p className="font-normal text-[14px]">Total Hours:</p>
              <p className="font-bold text-[14px]">
                {calculateHours(shiftData.clockIn, shiftData.clockOut)}
              </p>
            </div>
          </div>
        </div>

        <div><hr className="border-t border-gray" /></div>

        {/* Daily Shift Report */}
        <div className="flex flex-col">
          <p className="font-bold text-[16px] leading-[24px]">Daily Shift Report</p>
          <p className="font-normal text-[12px] leading-[24px] text-[#535E5E]">
            Include details about: activities, medications, meals, mood,
            interactions, health observations, and any concerns.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <textarea
            className="w-full border border-light-gray rounded p-3 h-70 focus:outline-none bg-[#F3F3F5] placeholder:text-[#535E5E] scroll-auto"
            placeholder="Begin your report"
            value={text}
            onChange={handleChange}
          ></textarea>
          <p
            className={`mt-2 text-sm ${
              isTooShort ? "text-[#535E5E]" : "text-green-600"
            }`}
          >
            {isTooShort
              ? `Minimum ${minWords} words required (${wordCount}/${minWords})`
              : `✅ Word count: ${wordCount}`}
          </p>
        </div>

        <div><hr className="border-t border-gray" /></div>

        {/* Buttons */}
        <div className="flex justify-end gap-5">
          <button
            onClick={handleSaveDraft}
            className="border border-dark-green text-dark-green px-4 py-[10px] rounded-md font-normal text-[16px]"
          >
            Save as Draft
          </button>
          <button
            onClick={handleSubmit}
            className="bg-dark-green text-white px-4 py-[10px] rounded-md font-normal text-[16px]"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Other Actions */}
      <div className="flex flex-col">
        <div>
          <p className="font-bold text-[28px] leading-[32px]">Other Actions</p>
        </div>
        <div className="flex flex-col gap-4">
          {actions.map((action, index) => (
            <ActionCard key={index}  onClick={() => setShowForm(action.type) } {...action}/>
          ))}
        </div>
      </div>
    </div>}

  </>
  );
};

export default ReportsSection;
