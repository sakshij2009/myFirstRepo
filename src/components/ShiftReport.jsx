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

const formatDate = (value) => {
  if (!value) return "—";

  // Firestore Timestamp
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // Old string dates (backward compatibility)
  if (typeof value === "string") {
    return value;
  }

  return "—";
};

const renderDate = (value) => {
  if (!value) return "—";

  // Firestore Timestamp
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // JS Date
  if (value instanceof Date) {
    return value.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // String (old schema)
  if (typeof value === "string") return value;

  return "—";
};



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
        const ref = doc(db, "InTakeForms", shiftData.clientId);
        const snap = await getDoc(ref);
        if (snap.exists()) setIntakeData(snap.data());
      } catch (err) {
        console.error("Error fetching intake:", err);
      }
    };

    fetchIntake();
  }, [shiftData]);


  const resolveClientAndDate = (shiftData) => {
  if (!shiftData) return { clientId: "", startDate: null };

  const clientId =
    shiftData.clientId ||              // old
    shiftData.client ||                // new
    shiftData.clientDetails?.id || ""; // fallback

  let startDate = null;

  if (shiftData.startDate?.toDate) {
    // ✅ Firestore Timestamp
    startDate = shiftData.startDate.toDate();
  } else if (typeof shiftData.startDate === "string") {
    // ✅ Old string format: "25 Dec 2025"
    const parts = shiftData.startDate.split(" ");
    if (parts.length === 3) {
      const [day, mon, year] = parts;
      startDate = new Date(`${day} ${mon} ${year}`);
    }
  }

  return { clientId, startDate };
};

  // -------------------- 3. FETCH REPORTS (24 HOURS) --------------------
 

 
useEffect(() => {

 
 if (!shiftData) {
  console.log("⏳ shiftData not ready yet");
  return;
}

const { clientId: resolvedClientId, startDate: resolvedStartDate } =
  resolveClientAndDate(shiftData);

if (!resolvedClientId || !resolvedStartDate || isNaN(resolvedStartDate.getTime())) {
  console.log("❌ Missing or invalid clientId/startDate", {
    resolvedClientId,
    resolvedStartDate,
    shiftData,
  });
  return;
}



  

 const shiftStart = resolvedStartDate;

const windowStart = new Date(
  shiftStart.getTime() - 24 * 60 * 60 * 1000
);


  const fetchReports = async () => {
    try {
      const snapshot = await getDocs(collection(db, "shifts"));
      const finalReports = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Match clientId
       const dataClientId =
  data.clientId || data.client || data.clientDetails?.id;

if (String(dataClientId) !== String(resolvedClientId)) return;


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
    
  }
}

finalReports.push({
  shiftId: docSnap.id,
  shiftReport: parsedReport,
  staffName: data.name || "Unknown"
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
  if (!shiftData) return;

  const fetchPrimaryStaff = async () => {
    try {
      let userDocData = null;
      const usersRef = collection(db, "users");

      // ✅ Try by Firestore Document ID
      if (shiftData.userId) {
        const directDoc = await getDoc(doc(db, "users", shiftData.username));
        if (directDoc.exists()) userDocData = directDoc.data();
      }

      // ✅ Try by 'id' field in user document
      if (!userDocData && shiftData.userId) {
        const qById = query(usersRef, where("userId", "==", shiftData.userId));
        const snapById = await getDocs(qById);
        if (!snapById.empty) userDocData = snapById.docs[0].data();
      }

      // ✅ Try by username
      if (!userDocData && shiftData.user) {
        const qByUsername = query(usersRef, where("username", "==", shiftData.user || shiftData.username));
        const snapByUsername = await getDocs(qByUsername);
        if (!snapByUsername.empty) userDocData = snapByUsername.docs[0].data();
      }

      // ✅ Try by name
      if (!userDocData && shiftData.userName) {
        const qByName = query(usersRef, where("name", "==", shiftData.name));
        const snapByName = await getDocs(qByName);
        if (!snapByName.empty) userDocData = snapByName.docs[0].data();
      }

      // ✅ Finally, set primary staff
      if (userDocData) {
        console.log("✅ Primary staff fetched:", userDocData);
        setPrimaryStaff({
          name: userDocData.name || "N/A",
          staffId: userDocData.id || userDocData.userId || "N/A",
          category:
            shiftData.categoryName ||
            shiftData.shiftCategory ||
            "N/A",
          avatar:
            userDocData.profilePhotoUrl ||
            userDocData.photoURL ||
            userDocData.profilePhoto ||
            userDocData.profilePic ||
            userDocData.avatar ||
            null,
        });
      } else {
        console.warn("⚠️ No user document found for staff:", shiftData.userId);
        setPrimaryStaff({
          name:
            shiftData.userName ||
            shiftData.name ||
            shiftData.user ||
            "N/A",
          staffId: shiftData.userId || "N/A",
          category:
            shiftData.categoryName ||
            shiftData.shiftCategory ||
            "N/A",
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

  const normalized = {
  clientId:
    shiftData.clientId ||
    shiftData.client ||
    shiftData.clientDetails?.id ||
    "N/A",

  clientName:
    shiftData.clientName ||
    shiftData.clientDetails?.name ||
    "N/A",

  dob:
    shiftData.dob ||
    shiftData.clientDetails?.dob ||
    "N/A",

  avatar:
    shiftData.clientAvatar ||
    shiftData.clientDetails?.avatar ||
    null,

  category:
    shiftData.categoryName ||
    shiftData.category ||
    shiftData.shiftCategory ||
    "N/A",

  startDate:
    shiftData.startDate ||
    shiftData.startDateTime ||
    null,

  startTime: shiftData.startTime || "—",
  endTime: shiftData.endTime || "—",
};


  return (
    <div className="flex flex-col gap-6 p-2">

     <div className="flex gap-3 items-center ">
        <IoArrowBack size={22}  className="flex items-center justify-center" onClick={() => navigate(-1)}/>
      <p className="font-bold text-[24px] text-light-black">Reports</p>
     </div>
      
      <hr className="border-t border-gray" />

      <div className="flex h-[calc(100vh-100px)] overflow-hidden gap-4">

  {/* -------------- LEFT PANEL (FIXED) -------------- */}
  <div className="w-[320px] flex-shrink-0 overflow-y-auto sticky top-0 h-full">
    <div className="flex flex-col gap-4 p-3 bg-white border border-light-gray rounded text-light-black">
      {/* --- Client Statistics --- */}
      <p className="font-bold text-[16px]">Client Statistics</p>

      <div className="flex gap-4 ">
        <div className="h-22 w-22 rounded-full flex items-center justify-center">
          {normalized.avatar
            ? <img src={normalized.avatar} className="h-full w-full" />
            : <img src="/images/profile.jpeg" className="rounded-full"/>
          }
        </div>

        <div className="flex flex-col gap-1 text-nowrap ">
          <div className="flex gap-2">
            <p className="font-normal text-[14px] leading-[20px]">Name:</p>
            <p className="font-bold text-[14px] leading-[20px] w-[127px] truncate" title={normalized.clientName}>
              {normalized.clientName || "N/A"}
            </p>
          </div>

          <div className="flex gap-2">
            <p className="font-normal text-[14px] leading-[20px]">Client ID:</p>
            <p className="font-bold text-[14px] leading-[20px]">{normalized.clientId || "N/A"}</p>
          </div>

          <div className="flex gap-2">
            <p className="font-normal text-[14px] leading-[20px]">Shift Category:</p>
            <p className="font-bold text-[14px] leading-[20px] truncate w-[127px]" title={normalized.category}>
              {normalized.category || "N/A"}
            </p>
          </div>

          <div className="flex gap-2">
            <p className="font-normal text-[14px] leading-[20px]">Date of Birth:</p>
            <p className="font-bold text-[14px] leading-[20px]">{normalized.dob || "N/A"}</p>
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
              {report.staffName && (
                <span className="text-gray-700 font-medium"> — {report.staffName}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 text-sm">No reports in last 24 hours.</p>
      )}

      <hr className="text-light-gray"/>

      {/* --- Primary Staff --- */}
      <p className="font-bold text-[16px]">Primary Staff</p>
      <div className="flex gap-4 items-center">
        <div className="h-25 w-25 rounded-full bg-gray-300 overflow-hidden">
          {primaryStaff?.avatar
            ? <img src={primaryStaff.avatar} className="h-full w-full" />
            : <img src="/images/profile.jpeg" className="rounded-full"/>
          }
        </div>

        <div className="text-sm flex flex-col gap-1">
          <p><b>Name:</b> {primaryStaff?.name}</p>
          <p><b>Staff ID:</b> {primaryStaff?.staffId}</p>
          <p className="truncate w-[200px]" title={primaryStaff?.category}>
            <b>Shift Category:</b> {primaryStaff?.category}
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* -------------- RIGHT PANEL (SCROLLABLE) -------------- */}
  <div className="flex-1 overflow-y-auto pr-2">
    <div className="flex flex-col flex-4/5 gap-4">
      <div className="w-full">
        <div className="flex space-x-6 relative border-b border-gray-300">
          {["Reports", "Medications", "Service Plan", "Transportation"].map((tab) => {
            const isActive = activeTab === tab.toLowerCase();
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`relative font-bold text-[14px] pb-2 transition-colors cursor-pointer ${
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
        {activeTab === "medications" && <MedicationPage shiftData={shiftData} user={user} />}
        {activeTab === "serviceplan" && <div>Service Plan Component Here</div>}
        {activeTab === "transportation" && (
          <AddTransportation shiftId={shiftId} shiftData={shiftData} />
        )}
      </div>
    </div>
  </div>
</div>

{isModalOpen && selectedReport && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white w-[600px] p-3 rounded shadow-lg relative max-h-[90vh] overflow-y-auto">

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
         <p><strong>Date:</strong> {renderDate(selectedShiftInfo.startDate)}</p>

          <p><strong>Start Time:</strong> {selectedShiftInfo.startTime || "N/A"}</p>
          <p><strong>End Time:</strong> {selectedShiftInfo.endTime || "N/A"}</p>
          <p><strong>Staff Name:</strong> {selectedShiftInfo.name || "N/A"}</p>
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
