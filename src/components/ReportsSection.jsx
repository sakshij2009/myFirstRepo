import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import ActionCard from "./ActionCard";
import CriticalIncidentForm from "./CriticalIncidentForm";
import NoteworthyIncidentForm from "./NoteworthyIncidentForm";
import FollowThroughForm from "./FollowThroughForm";
import MedicalLogForm from "./MedicalLogForm";

const ReportsSection = ({ shiftId, shiftData, user, readOnly = false }) => {
  const [text, setText] = useState("");
  const [showForm, setShowForm] = useState(null);
  const [reportAccess, setReportAccess] = useState(shiftData?.accessToShiftReport || false);

  const handleReportAccessToggle = async () => {
    const newValue = !reportAccess;
    setReportAccess(newValue);
    try {
      await updateDoc(doc(db, "shifts", shiftId), { accessToShiftReport: newValue });
    } catch (err) {
      console.error("Error updating report access:", err);
      setReportAccess(!newValue);
    }
  };

  // Edit Clock states
  const [isEditingClock, setIsEditingClock] = useState(false);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [savingClock, setSavingClock] = useState(false);


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

  // ✅ Calculate total hours between clockIn and clockOut
  const calculateHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return "—";
    try {
      let start = clockIn.toDate ? clockIn.toDate() : new Date(clockIn);
      let end = clockOut.toDate ? clockOut.toDate() : new Date(clockOut);

      // Handle raw string formats like "11:30 AM" that fail native Date parsing
      if (isNaN(start.getTime()) && typeof clockIn === "string") {
        const dummyDate = new Date().toISOString().split("T")[0];
        start = new Date(`${dummyDate} ${clockIn}`);
      }
      if (isNaN(end.getTime()) && typeof clockOut === "string") {
        const dummyDate = new Date().toISOString().split("T")[0];
        end = new Date(`${dummyDate} ${clockOut}`);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";

      let diffMs = end - start;
      if (diffMs < 0) diffMs += (24 * 60 * 60 * 1000); // Past midnight fix

      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours.toFixed(2);
    } catch (error) {
      console.error("Error calculating hours:", error);
      return "—";
    }
  };

  const renderDate = (value) => {
    if (!value) return "—";

    // Firestore Timestamp
    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    // Old string dates
    if (typeof value === "string") return value;

    return "—";
  };


  const calculateOvertime = (shiftData) => {
    try {
      const { startTime, endTime, clockIn, clockOut } = shiftData;
      if (!clockIn || !clockOut || !startTime || !endTime) return "—";

      // Convert actual clock-in/out
      const actualStart = clockIn.toDate ? clockIn.toDate() : new Date(clockIn);
      const actualEnd = clockOut.toDate ? clockOut.toDate() : new Date(clockOut);
      const actualHours = (actualEnd - actualStart) / (1000 * 60 * 60);

      // Parse scheduled start/end (e.g., "09:00" or "09:00 AM")
      const parseTime = (t) => {
        const [hours, minutes] = t.match(/(\d+):(\d+)/).slice(1);
        const isPM = /pm/i.test(t);
        let h = parseInt(hours, 10);
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return { h, m: parseInt(minutes, 10) };
      };

      const start = parseTime(startTime);
      const end = parseTime(endTime);
      const scheduledStart = new Date(actualStart);
      scheduledStart.setHours(start.h, start.m, 0);
      const scheduledEnd = new Date(actualStart);
      scheduledEnd.setHours(end.h, end.m, 0);
      const scheduledHours = (scheduledEnd - scheduledStart) / (1000 * 60 * 60);

      const overtime = actualHours - scheduledHours;
      return overtime > 0 ? overtime.toFixed(2) : "0.00";
    } catch (err) {
      console.error("Error calculating overtime:", err);
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
    // No minimum word count restriction anymore
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

  // Format time (e.g., "08:59 AM") using local machine timezone automatically
  const formatTime = (timestamp) => {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

      // If it evaluates to invalid date, but is a raw text like "11:30 AM", return it as is.
      if (isNaN(date.getTime()) && typeof timestamp === "string") {
        return timestamp;
      }

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return typeof timestamp === "string" ? timestamp : "—";
    }
  };

  // Convert Firebase Date string / Timestamp into "YYYY-MM-DDTHH:MM" format for datetime-local
  const toDatetimeLocal = (val, fallbackDate, fallbackTimeStr) => {
    if (val) {
      let d = typeof val === "string" ? new Date(val) : (val.toDate ? val.toDate() : new Date(val));
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      // If val is a string like "11:30 AM" it falls into the fallback below.
    }

    // Attempt fallback from shift startDate/startTime
    if (fallbackDate) {
      try {
        const base = typeof fallbackDate?.toDate === "function" ? fallbackDate.toDate() : new Date(fallbackDate);
        let d = new Date(base);

        // if val string (like "11:30 AM") is present, use it over fallbackTimeStr
        let timeToParse = typeof val === "string" && isNaN(new Date(val).getTime()) ? val : fallbackTimeStr;

        if (timeToParse) {
          // Basic parse for "11:30 AM" or "11:30"
          const timeMatch = timeToParse.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            let m = parseInt(timeMatch[2], 10);
            let ampm = timeMatch[3];
            if (ampm) {
              if (ampm.toUpperCase() === "PM" && h < 12) h += 12;
              if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
            }
            d.setHours(h, m, 0, 0);
          }
        }

        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return "";
      }
    }
    return "";
  };

  // Turn ON edit clock mode
  const handleEditClockStart = () => {
    setIsEditingClock(true);
    setEditClockIn(toDatetimeLocal(shiftData?.clockIn, shiftData?.startDate, shiftData?.startTime));
    setEditClockOut(toDatetimeLocal(shiftData?.clockOut, shiftData?.startDate, shiftData?.endTime));
  };

  // Save new clock items
  const handleSaveClock = async () => {
    setSavingClock(true);
    try {
      const shiftRef = doc(db, "shifts", shiftId);
      const updates = {};
      if (editClockIn) {
        updates.clockIn = new Date(editClockIn).toISOString();
        shiftData.clockIn = updates.clockIn; // visually immediate update fallback
      }
      if (editClockOut) {
        updates.clockOut = new Date(editClockOut).toISOString();
        shiftData.clockOut = updates.clockOut;
      }

      await updateDoc(shiftRef, updates);
      setIsEditingClock(false);
      alert("Clock times updated successfully!");
    } catch (err) {
      console.error("Error saving clock times:", err);
      alert("Failed to save clock times.");
    } finally {
      setSavingClock(false);
    }
  };



  const actions = [
    {
      title: "Critical Incident Reporting",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Report Critical Incident",
      onlyUseWhen: "Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "red",
      type: "critical",
    },
    {
      title: "Contact Note",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Contact Note",
      onlyUseWhen: "Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "blue",
      type: "contact",
    },
    {
      title: "Noteworthy Event",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Noteworthy Event",
      onlyUseWhen: "Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
      color: "orange",
      type: "noteworthy",
    },
    {
      title: "Follow Through",
      description: "For serious incidents requiring immediate management attention",
      buttonText: "Follow Through",
      onlyUseWhen: "Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.",
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

      {!showForm && <div className="flex flex-col gap-4 text-light-black">
        {/* Report Section */}
        <div className="flex flex-col bg-white rounded py-3 px-4 gap-4">
          <div className="flex">
            <p className="font-bold text-[28px] leading-[32px]">Shift Report</p>
          </div>

          {/* Report Info */}
          <div className="flex flex-wrap items-center text-sm gap-6">
            <div>
              <span className="font-semibold">Date:</span>{renderDate(shiftData.startDate)}
            </div>
            <div>
              <span className="font-semibold">Staff Name:</span> {shiftData.name || shiftData.userName}
            </div>
            <div>
              <span className="font-semibold">Staff ID:</span> {shiftData.userId || shiftData.userId}
            </div>
            <div className="truncate w-[200px]" title={shiftData.clientName}>
              <span className="font-semibold" >Client Name:</span> {shiftData.clientName || shiftData?.clientDetails.name}
            </div>
            <div>
              <span className="font-semibold">Shift Time:</span> {shiftData.startTime} - {shiftData.endTime}
            </div>
          </div>



          <div><hr className="border-t border-gray" /></div>

          {/* Clock In / Out Information */}
          {!readOnly && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center w-full">
                  <p className="font-bold text-[16px] leading-[24px]">Shift Timeline</p>
                  {!isEditingClock && (
                    <button
                      onClick={handleEditClockStart}
                      className="font-medium cursor-pointer text-[#007595] text-[13px] hover:underline"
                    >
                      Edit Clock
                    </button>
                  )}
                </div>

                {isEditingClock ? (
                  <div className="flex flex-wrap gap-4 items-end bg-[#F3F3F5] p-3 rounded border border-light-gray">
                    <div className="flex flex-col gap-1 w-[200px]">
                      <label className="text-gray-600 text-[13px] font-semibold">Clock In</label>
                      <input
                        type="datetime-local"
                        value={editClockIn}
                        onChange={(e) => setEditClockIn(e.target.value)}
                        className="border border-gray-300 rounded p-[6px] text-[13px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-[200px]">
                      <label className="text-gray-600 text-[13px] font-semibold">Clock Out</label>
                      <input
                        type="datetime-local"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                        className="border border-gray-300 rounded p-[6px] text-[13px]"
                      />
                    </div>
                    <div className="flex gap-2 pb-1">
                      <button
                        onClick={handleSaveClock}
                        disabled={savingClock}
                        className="bg-dark-green text-white px-3 py-1 rounded text-[13px] hover:opacity-90 disabled:opacity-50"
                      >
                        {savingClock ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditingClock(false)}
                        className="border border-gray-400 text-gray-700 px-3 py-1 rounded text-[13px] hover:bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap text-[14px] leading-[20px] gap-6 text-light-black items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 text-[13px]">Clock In</span>
                      <span className="font-bold">{shiftData?.clockIn ? formatTime(shiftData.clockIn) : "—"}</span>
                      {shiftData?.clockIn && <span className="text-[10px] text-gray-400 ml-1">Location</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 text-[13px]">Clock Out</span>
                      <span className="font-bold">{shiftData?.clockOut ? formatTime(shiftData.clockOut) : "—"}</span>
                      {shiftData?.clockOut && <span className="text-[10px] text-gray-400 ml-1">Location</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 text-[13px]">Total Hours</span>
                      <span className="font-bold text-blue-600">
                        {calculateHours(shiftData?.clockIn, shiftData?.clockOut)} {(shiftData?.clockIn && shiftData?.clockOut) ? "Hours" : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div><hr className="border-t border-gray" /></div>
            </>
          )}

          {/* Daily Shift Report */}
          <div className="flex flex-col">
            <p className="font-bold text-[16px] leading-[24px]">Daily Shift Report</p>
            <p className="font-normal text-[12px] leading-[24px] text-[#535E5E]">
              Include details about: activities, medications, meals, mood,
              interactions, health observations, and any concerns.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {!readOnly ? (
              <textarea
                className="w-full border border-light-gray rounded p-3 h-150 focus:outline-none bg-[#F3F3F5] placeholder:text-[#535E5E] scroll-auto"
                placeholder="Begin your report"
                value={text}
                onChange={handleChange}
              ></textarea>
            ) : (
              <div className="w-full border border-light-gray rounded p-3 min-h-[150px] bg-[#F3F3F5] text-sm whitespace-pre-wrap">
                {text || "No report text found."}
              </div>
            )}

            {!readOnly && (
              <p className="mt-2 text-sm text-[#535E5E]">
                Word count: {wordCount}
              </p>
            )}
          </div>

          <div><hr className="border-t border-gray" /></div>

          {/* Buttons + Access Toggle */}
          {!readOnly && (
            <div className="flex justify-between items-center">
              {/* Access to Shift Report toggle — bottom right */}
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-light-black">Access to Shift Report</span>
                <span className="text-sm text-light-black">No</span>
                <div
                  onClick={handleReportAccessToggle}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${reportAccess ? "bg-dark-green" : "bg-gray-400"}`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow transform transition ${reportAccess ? "translate-x-6" : "translate-x-0"}`} />
                </div>
                <span className="text-sm text-light-black">Yes</span>
              </div>

              <div className="flex gap-5">
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
          )}
        </div>

        {/* Other Actions */}
        <div className="flex flex-col">
          <div>
            <p className="font-bold text-[28px] leading-[32px]">Other Actions</p>
          </div>
          <div className="flex flex-col gap-4">
            {actions.map((action, index) => (
              <ActionCard key={index} onClick={() => setShowForm(action.type)} {...action} />
            ))}
          </div>
        </div>
      </div>}

    </>
  );
};

export default ReportsSection;
