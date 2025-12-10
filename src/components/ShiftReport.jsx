import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaRegUserCircle } from "react-icons/fa";
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import ReportsSection from "./ReportsSection";
import MedicationPage from "./MedicationPage";
import AddTransportation from "./AddTransportation";
import { IoArrowBack } from "react-icons/io5";

const ShiftReport = ({ user }) => {
  const { id: shiftId } = useParams();

  // -------------------- STATES --------------------
  const [activeTab, setActiveTab] = useState("reports");
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [intakeData, setIntakeData] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [primaryStaff, setPrimaryStaff] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedShiftInfo, setSelectedShiftInfo] = useState(null);

const navigate = useNavigate();

  function parseShiftDate(dateString) {
  // Example input: "20 May 2025"
  // Break string into parts
  const [day, monthName, year] = dateString.split(" ");

  // Convert month (May → 4)
  const monthIndex = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ].findIndex(m => m.toLowerCase() === monthName.slice(0,3).toLowerCase());

  if (monthIndex === -1) return null;

  return new Date(Number(year), monthIndex, Number(day));
}


  // -------------------- 1. FETCH SHIFT DATA --------------------
  useEffect(() => {
    if (!shiftId) return;

    const fetchShift = async () => {
      try {
        const ref = doc(db, "shifts", shiftId);
        const snap = await getDoc(ref);

        if (snap.exists()) setShiftData(snap.data());
      } catch (err) {
        console.error("Error fetching shift:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchShift();
  }, [shiftId]);

  // -------------------- 2. FETCH INTAKE FORM AFTER SHIFT DATA --------------------
  useEffect(() => {
    if (!shiftData?.clientId) return;

    const fetchIntake = async () => {
      try {
        const ref = doc(db, "intakeForms", shiftData.clientId);
        const snap = await getDoc(ref);
        if (snap.exists()) setIntakeData(snap.data());
      } catch (err) {
        console.error("Error fetching intake:", err);
      }
    };

    fetchIntake();
  }, [shiftData]);

  // -------------------- 3. FETCH REPORTS (24 HOURS) --------------------
 

useEffect(() => {
  if (!shiftData?.clientId || !shiftData?.startDate) {
    console.log("❌ Missing clientId or startDate in shiftData");
    return;
  }

  // --- SAFE date parser for "20 May 2025"
  const parseShiftDate = (str) => {
    if (typeof str !== "string") return null;

    const [day, monthName, year] = str.split(" ");

    const monthIndex = [
      "jan","feb","mar","apr","may","jun",
      "jul","aug","sep","oct","nov","dec"
    ].indexOf(monthName.toLowerCase().slice(0,3));

    if (monthIndex === -1) return null;

    return new Date(Number(year), monthIndex, Number(day));
  };

  // Convert startDate (supports string or Firestore Timestamp)
  let shiftStart;

  if (shiftData.startDate?.toDate) {
    shiftStart = shiftData.startDate.toDate(); // Firestore timestamp
  } else {
    shiftStart = parseShiftDate(shiftData.startDate); // string parser
  }

  if (!shiftStart || isNaN(shiftStart.getTime())) {
    console.log("❌ Invalid startDate format:", shiftData.startDate);
    return;
  }

  // 24-hour window before shiftStart
  const windowStart = new Date(shiftStart.getTime() - 24 * 60 * 60 * 1000);

  console.log("🕒 Parsed Shift Start:", shiftStart);
  console.log("⏳ Fetching from window:", windowStart);

  const fetchReports = async () => {
    try {
      const snapshot = await getDocs(collection(db, "shifts"));
      const finalReports = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Match clientId
        if (String(data.clientId) !== String(shiftData.clientId)) return;

        // Parse each shift's date
        let sDate = data.startDate?.toDate?.() || parseShiftDate(data.startDate);
        if (!sDate || isNaN(sDate.getTime())) return;

        // Inside previous 24-hour window?
        if (sDate >= windowStart && sDate < shiftStart) {
          console.log("➡ Found matching shift:", docSnap.id);

          

let parsedReport = data.shiftReport;

// If report is stored as a JSON string → parse it
if (typeof parsedReport === "string") {
  try {
    parsedReport = JSON.parse(parsedReport);
  } catch (err) {
    console.error("❌ JSON parse failed for report:", parsedReport);
  }
}

finalReports.push({
  shiftId: docSnap.id,
  shiftReport: parsedReport,
});


        }
      });

    

      console.log("🎉FINAL 24H REPORTS:", finalReports);
      setRecentReports(finalReports);

    } catch (err) {
      console.error(" Error fetching optimized reports:", err);
    }
  };

  fetchReports();
}, [shiftData]);


  // -------------------- 4. PRIMARY STAFF --------------------
 useEffect(() => {
  if (!shiftData?.userId) return;

  const fetchPrimaryStaff = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("userId", "==", shiftData.userId)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const userDoc = snap.docs[0].data();

        setPrimaryStaff({
          name: userDoc.name || "N/A",
          staffId: userDoc.userId,
          category: shiftData.categoryName,
          avatar: userDoc.profilePhotoUrl || userDoc.avatar || null,
        });
      } else {
        // Fallback
        setPrimaryStaff({
          name: null,
          staffId: shiftData.userId,
          category: shiftData.categoryName,
          avatar: null,
        });
      }
    } catch (err) {
      console.error("Error fetching primary staff:", err);
    }
  };

  fetchPrimaryStaff();
}, [shiftData]);

const fetchShiftById = async (shiftId, report) => {
  try {
    const ref = doc(db, "shifts", shiftId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setSelectedShiftInfo(snap.data());   // Contains startDate, startTime, endTime
    } else {
      setSelectedShiftInfo(null);
    }

    setSelectedReport(report);
    setIsModalOpen(true);

  } catch (err) {
    console.error("Error fetching shift details:", err);
  }
};


  // -------------------- RENDER LOGIC --------------------
  if (loading) return <div className="p-7 text-gray-500">Loading…</div>;
  if (!shiftData) return <div className="p-7 text-red-500">Shift not found</div>;

  const {
    clientName,
    clientId,
    categoryName,
    dob,
    clientAvatar
  } = shiftData;

  return (
    <div className="flex flex-col gap-6 p-2">

     <div className="flex gap-3 items-center ">
        <IoArrowBack size={22}  className="flex items-center justify-center" onClick={() => navigate(-1)}/>
      <p className="font-bold text-[24px] text-light-black">Reports</p>
     </div>
      
      <hr className="border-t border-gray" />

      <div className="flex gap-4">

        {/* -------------- LEFT PANEL -------------- */}
        <div className="flex flex-col flex-1/5 gap-4">
          <div className="bg-white p-3 rounded border border-light-gray flex flex-col gap-4 text-light-black">

            {/* --- Client Statistics --- */}
            <p className="font-bold text-[16px]">Client Statistics</p>

            <div className="flex gap-4 ">
              <div className="h-22 w-22 rounded-full overflow-hidden flex items-center justify-center">
                {clientAvatar
                  ? <img src={clientAvatar} className="h-full w-full object-cover" />
                  : <img src="/images/profile.jpeg" className="rounded-full"/>
                }
              </div>

             <div className="flex flex-col gap-1 text-nowrap ">
                {/* Name */}
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">Name:</p>
                  <p
                    className="font-bold text-[14px] leading-[20px] w-[127px] truncate"
                    title={clientName}
                  >
                    {clientName || "N/A"}
                  </p>
                </div>

                {/* Client ID */}
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">Client ID:</p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {clientId || "N/A"}
                  </p>
                </div>

                {/* Shift Category */}
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">Shift Category:</p>
                  <p
                    className="font-bold text-[14px] leading-[20px] truncate w-[127px]"
                    title={categoryName}
                  >
                    {categoryName || "N/A"}
                  </p>
                </div>

                {/* Date of Birth */}
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">Date of Birth:</p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {dob || "N/A"}
                  </p>
                </div>

              </div>

            </div>

            <hr className="text-light-gray"/>

            {/* --- Medical Info --- */}
            <p className="font-bold text-[16px]">Medical Info</p>

            {intakeData?.medicalConcerns?.length ? (
              <ul className="list-disc pl-4 text-sm">
                {intakeData.medicalConcerns.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">Not available</p>
            )}

            <hr className="text-light-gray"/>

            {/* --- View Reports --- */}
            <p className="font-bold text-[16px]">View Previous Reports</p>

           {recentReports.length ? (
          <ul className="list-disc pl-4 text-sm">
            {recentReports.map((report, i) => (
              <li
                key={i}
                className="text-dark-green cursor-pointer hover:underline"
                onClick={() => fetchShiftById(report.shiftId, report)}

              >
                Report {i + 1}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-sm">No reports in last 24 hours.</p>
        )}


            
           

          </div>
          <div className="flex flex-col gap-4 bg-white p-4 rounded border border-light-gray text-light-black">
             <p className="font-bold text-[16px]">Primary Staff</p>

            <div className="flex gap-4 items-center">
              <div className="h-23 w-23 rounded-full bg-gray-300 overflow-hidden">
                {primaryStaff?.avatar
                  ? <img src={primaryStaff.avatar} className="h-full w-full object-cover" />
                  : <img src="/images/profile.jpeg" className="rounded-full"/>
                }
              </div>

              <div className="text-sm flex flex-col gap-1">
                <p><b>Name:</b> {primaryStaff?.name}</p>
                <p><b>Staff ID:</b> {primaryStaff?.staffId}</p>
                <p className="truncate w-[200px]" title={primaryStaff?.category}><b>Shift Category:</b> {primaryStaff?.category}</p>
              </div>
            </div>

          </div>
        </div>

        {/* -------------- RIGHT SECTION (UNCHANGED) -------------- */}
        <div className="flex flex-col flex-4/5 gap-4">
         <div className="w-full">
          <div className="flex space-x-6 relative border-b border-gray-300">
            {["Reports", "Medications", "Service Plan", "Transportation"].map((tab) => {
              const isActive = activeTab === tab.toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`relative font-bold text-[14px] pb-2 transition-colors ${
                    isActive ? "text-dark-green" : "text-black"
                  }`}
                >
                  {tab}
                  {isActive && (
                    <span className="absolute left-0 bottom-0 h-[2px] w-full bg-dark-green"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>


          <div>
            {activeTab === "reports" && (
              <ReportsSection shiftId={shiftId} shiftData={shiftData} user={user} />
            )}
            {activeTab === "medications" && <MedicationPage shiftData={shiftData} />}
            {activeTab === "serviceplan" && <div>Service Plan Component Here</div>}
            {activeTab === "transportation" && (
              <AddTransportation shiftId={shiftId} shiftData={shiftData} />
            )}
          </div>
        </div>

      </div>
{isModalOpen && selectedReport && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white w-[550px] p-3 rounded shadow-lg relative max-h-[80vh] overflow-y-auto">

      {/* Close Button */}
      <button
        className="absolute top-2 right-3 text-gray-600 text-xl"
        onClick={() => setIsModalOpen(false)}
      >
        ×
      </button>

      <h2 className="text-lg font-bold text-dark-green mb-4">
        Shift Report
      </h2>

      {/* ⭐ Show shift date & times */}
      {selectedShiftInfo && (
        <div className="mb-4 text-sm text-light-black space-x-3 flex ">
          <p><strong>Date:</strong> {String(selectedShiftInfo.startDate)}</p>
          <p><strong>Start Time:</strong> {selectedShiftInfo.startTime || "N/A"}</p>
          <p><strong>End Time:</strong> {selectedShiftInfo.endTime || "N/A"}</p>
        </div>
      )}

      {/* ⭐ Show Report */}
      <div className="whitespace-pre-wrap text-sm p-2 bg-gray-100 rounded">
        {selectedReport.shiftReport || "No report text found"}
      </div>

    </div>
  </div>
)}



    </div>
    
  );
};

export default ShiftReport;
