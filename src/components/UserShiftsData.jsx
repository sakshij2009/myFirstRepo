// UserShiftsData.jsx
import React, { useEffect, useState } from "react";
import { SiTicktick } from "react-icons/si";
import { VscDebugStart } from "react-icons/vsc";
import { BiTransfer } from "react-icons/bi";
import { FaChevronDown } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

import {
  doc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { sendNotification } from "../utils/notificationHelper"; // adjust path if needed

const UserShiftsData = ({ user, userShifts = [] }) => {
  // pagination + local UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [localConfirmed, setLocalConfirmed] = useState({});

  // staff & modal state
  const [staffList, setStaffList] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  // transfer form state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [transferReason, setTransferReason] = useState("");

  const navigate = useNavigate();

   const formatDate = (timestamp) => {
  if (!timestamp) return "-";

  // Firebase Timestamp support
  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

  // Fetch staff list on mount (you can change the where clause to fit your app)
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        // Fetch all users. If you want only caregivers or same-company staff,
        // change the query accordingly (e.g., where("role","==","caregiver"))
        const usersRef = collection(db, "users");
        const q = query(usersRef); // no filter by default
        const snap = await getDocs(q);
        const staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStaffList(staff);
      } catch (error) {
        console.error("❌ Error fetching staff members:", error);
      }
    };

    fetchStaffMembers();
  }, []);

  // helpers
  const getShiftStatus = (clockIn, clockOut) => {
    if (clockIn && clockOut) return "Completed";
    if (clockIn && !clockOut) return "InProgress";
    return "Incomplete";
  };

  const getShiftCategoryStyle = (category) => {
    switch (category) {
      case "Emergent Care":
        return "bg-[#FFF1F2] border border-[#FFCCD3] rounded-[8px] py-1 px-2 mt-[3px] text-[#C70036] font-bold text-[14px] leading-[140%] w-[115px]";
      case "Supervised Visitation":
        return "bg-[#FFFBEB] border border-[#FEE685] rounded-[8px] py-1 px-2 mt-[3px] text-[#BF4D00] font-bold text-[14px] leading-[140%] w-[153px]";
      case "Respite Care":
        return "bg-[#ECFEFF] border border-[#A2F4FD] rounded-[8px] py-1 px-2 mt-[3px] text-[#007595] font-bold text-[14px] leading-[140%] w-[115px]";
      default:
        return "truncate font-bold text-[14px] leading-[140%]";
    }
  };

  // Confirm shift (existing logic)
  const handleConfirm = async (shiftId) => {
    try {
      const shiftRef = doc(db, "shifts", shiftId);
      await updateDoc(shiftRef, { shiftConfirmed: true });
      setLocalConfirmed((prev) => ({ ...prev, [shiftId]: true }));
      console.log(`✅ Shift ${shiftId} confirmed successfully`);
    } catch (error) {
      console.error("❌ Error confirming shift:", error);
    }
  };

  const handleViewReport = (shiftId) => {
    navigate(`/user-dashboard/shift-report/${shiftId}`);
  };

  const handleViewIntakeReport = (id) => {
    navigate(`/user-dashboard/add/intake-form/${id}`);
  };

  // Open transfer modal with chosen shift
  const handleTransfer = (shift) => {
    setSelectedShift(shift);
    // reset form values each time modal opens
    setSelectedStaff(null);
    setTransferReason("");
    setShowTransferModal(true);
  };

const handleTransferShift = async () => {
  try {
    if (!selectedStaff) {
      alert("Please select a staff member.");
      return;
    }

    if (!selectedShift || !user?.userId) {
      alert("Invalid shift or user.");
      return;
    }

    // 1️⃣ Create transfer request
    const transferRef = await addDoc(collection(db, "transferRequests"), {
      shiftId: selectedShift.id,
      fromUserId: user.userId,
      fromUserName: user.name,
      toUserId: selectedStaff.id,
      toUserName: selectedStaff.name || selectedStaff.fullName || selectedStaff.email,
      reason: transferReason || "",
      status: "pending",
      createdAt: Timestamp.now(),
    });

    const transferId = transferRef.id;

    // 2️⃣ Notify RECEIVING STAFF (Approve / Reject)
    await sendNotification(selectedStaff.id, {
      type: "action",
      title: "Shift Transfer Request",
      message: `${user.name} wants to transfer a shift to you.`,
      senderId: user.userId,
      actions: ["approve", "reject"],
      meta: {
        requestType: "shift-transfer",
        transferId,
        shiftId: selectedShift.id,
        fromUserId: user.userId,
      },
    });

    // 3️⃣ Notify ADMIN (FYI)
    const adminSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );

    if (!adminSnap.empty) {
      const adminId = adminSnap.docs[0].id;

      await sendNotification(adminId, {
        type: "info",
        title: "Shift Transfer Requested",
        message: `${user.name} requested to transfer a shift to ${selectedStaff.name}.`,
        senderId: user.userId,
        meta: {
          transferId,
          shiftId: selectedShift.id,
        },
      });
    }

    alert("Transfer request sent successfully.");
    setShowTransferModal(false);
    setSelectedStaff(null);
    setTransferReason("");
    setSelectedShift(null);

  } catch (err) {
    console.error("Transfer error:", err);
    alert("Failed to submit transfer request.");
  }
};


  const handleConfirmShift = async (shiftId) => {
  try {
    await updateDoc(doc(db, "shifts", shiftId), {
      shiftConfirmed: true,
    });
  } catch (error) {
    console.error("Error confirming shift:", error);
  }
};


  // Pagination setup
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(userShifts.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const filteredShifts = userShifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] w-full min-h-[300px]">
      {filteredShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <p className="text-lg font-semibold">No Shifts Found</p>
          <p className="text-sm text-gray-400">Looks like there are no shifts to display right now.</p>
        </div>
      ) : (
        filteredShifts.map((emp) => {
          const status = getShiftStatus(emp.clockIn, emp.clockOut);
          const isConfirmed = emp.shiftConfirmed || localConfirmed[emp.id] === true;
          const canMakeReport = isConfirmed;

          return (
            <div
              key={emp.id}
              className="flex flex-row bg-white h-[130px] justify-center items-center gap-[24px] py-3 px-4 rounded-[4px]"
            >
              <div className="flex items-center justify-center bg-gray-300 h-19 w-20 rounded-full overflow-hidden">
                <img
                  src={emp.image || "/images/defaultuser.jpg"}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col w-full justify-center gap-[8px]">
                <div className="flex flex-row justify-between text-[#2B3232] p-1">
                  <div className="flex flex-col gap-[2px]">
                    <div className="flex justify-start gap-6">
                      <p className="font-normal text-[14px] leading-[20px]">Client</p>
                      <p className="font-bold text-[14px] leading-[20px]">{emp.clientName || emp.clientDetails?.name ||  "-"}</p>
                    </div>
                    <div className="flex justify-start gap-[8px]">
                      <p className="font-normal text-[14px] leading-[20px]">Client ID</p>
                      <p className="font-bold text-[14px] leading-[20px]">{emp.clientId || emp.clientDetails?.id || "-"}</p>
                    </div>
                  </div>

                  <div className="flex flex-row gap-[24px] justify-end">
                    <div className="w-[100px]">
                      <p className="font-normal text-[14px] leading-[20px]">Report Number</p>
                      <p className="font-bold text-[14px] leading-[20px] truncate">01</p>
                    </div>
                    <div className="w-[100px]">
                      <p className="font-normal text-[14px] leading-[20px]">Date</p>
                      <p className="font-bold text-[14px] leading-[20px]">{formatDate(emp.startDate)}</p>
                    </div>
                    <div className="w-[100px]">
                      <p className="font-normal text-[14px] leading-[20px]">Shift Timeline</p>
                      <p className="font-bold text-[14px] leading-[20px]">
                        {emp.startTime}-{emp.endTime}
                      </p>
                    </div>
                    <div className="w-[160px]">
                      <p className="font-normal text-[14px] leading-[20px]">Shift Category</p>
                      <p className={getShiftCategoryStyle(emp.categoryName || emp.shiftCategory)} title={emp.categoryName || emp.shiftCategory}>
                        {emp.categoryName || emp.shiftCategory || "-"}
                      </p>
                    </div>
                    <div className="w-[75px]">
                      <p className="font-normal text-[14px] leading-[20px]">Shift Type</p>
                      <p className="font-bold text-[14px] leading-[20px]">{emp.typeName || emp.shiftType || '-'}</p>
                    </div>
                    <div className="w-[120px]">
                      <p className="font-normal text-[14px] leading-[20px]">Agency</p>
                      <p className="truncate font-bold text-[14px] leading-[20px]" title={emp.agencyName ||emp.clientDetails?.agencyName || "-"}>
                        {emp.agencyName}
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="flex border-t border-dashed border-gray" />

                <div className="flex justify-between text-light-green text-[14px] cursor-pointer ">
                  <div className="flex justify-center items-center font-medium" onClick={() => handleViewIntakeReport(emp.clientId)}>
                    <p>View Intake Report</p>
                  </div>

                  <div className="flex gap-2">
                    {/* Confirm Shift Button */}
                     {/* Confirm Shift / Confirmed Status */}
{emp.shiftConfirmed ? (
  <div
    className="flex items-center gap-2 px-3 py-[6px] border rounded-[6px]
               border-green-600 text-green-600 bg-green-50 cursor-default"
  >
   
    <p>Confirmed</p>
  </div>
) : (
  <div
    onClick={() => handleConfirmShift(emp.id)}
    className="flex items-center gap-2 px-3 py-[6px] border rounded-[6px]
               border-blue-600 text-blue-600 bg-white hover:bg-blue-50 cursor-pointer"
  >
    <VscDebugStart className="text-[18px]" />
    <p>Confirm Shift</p>
  </div>
)}

                   {emp.shiftReport ? (
                     <div
                       onClick={() => handleViewReport(emp.id)}
                       className="flex items-center gap-2 px-3 py-[6px] border rounded-[6px] 
                                  border-dark-green text-dark-green bg-white cursor-pointer hover:bg-[#e6f5ea]"
                     >
                       <VscDebugStart className="text-[18px]" />
                       <p>View Report</p>
                     </div>
                   ) : (
                     <div
                       onClick={() => handleViewReport(emp.id)}
                       className={`flex items-center gap-2 px-3 py-[6px] border rounded-[6px]
                         ${emp.shiftConfirmed 
                           ? "border-dark-green text-dark-green bg-white hover:bg-[#e6f5ea] cursor-pointer" 
                           : "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"}`}
                     >
                       <VscDebugStart className="text-[18px]" />
                       <p>Make Report</p>
                     </div>
                   )}

                    {/* Make Report Button */}
                    {/* <div
                      onClick={() => handleViewReport(emp.id)}
                      className={`flex items-center gap-2 px-3 py-[6px] border rounded-[6px] font-medium text-[14px] leading-[20px]
                        ${canMakeReport ? "border-[#1D5F33] text-[#1D5F33] bg-white hover:bg-[#e6f5ea] cursor-pointer" : "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"}`}
                    >
                      <VscDebugStart className="text-[18px]" />
                      <p>Make Report</p>
                    </div> */}

                    {/* Transfer Shift Button */}
                    <div
                      onClick={() => handleTransfer(emp)}
                      className="flex items-center gap-2 px-3 py-[6px] border border-[#FFB86A] text-[#F74A00] rounded-[6px] font-medium text-[14px] leading-[20px] cursor-pointer"
                    >
                      <BiTransfer className="text-[18px]" />
                      <p>Transfer Shift</p>
                    </div>
                    {/* //cancel shift */}
                    <div
                      onClick={() => handleViewReport(emp.id)}
                      className={`flex items-center gap-2 px-3 py-[6px] border rounded-[6px] font-medium text-[14px] leading-[20px]
                        ${canMakeReport ? "border-[#1D5F33] text-[#1D5F33] bg-white hover:bg-[#e6f5ea] cursor-pointer" : "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"}`}
                    >
                      <p>Cancel Shift</p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-1 py-[10px] px-4 rounded">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white">«</button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white">‹</button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
            .map((page) => (
              <button key={page} onClick={() => goToPage(page)} className={`px-3 py-1 border border-[#C5C5C5] rounded ${currentPage === page ? "bg-light-green text-white" : "bg-white"}`}>
                {page}
              </button>
            ))}

          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white">›</button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white">»</button>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 text-light-black ">
          <div className="flex flex-col bg-white rounded w-[500px] p-3 relative gap-3 max-h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-[24px] font-semibold leading-7">Shift Transfer</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>

            <hr className="border-t border-light-gray" />

            <div className="text-[12px] rounded text-[#2F5CE9] bg-[#EFF6FF] border border-[#D8E9FF] p-[10px]">
              When transferring your shift to another staff member, your transfer request will be sent for approval to the Supervisor and the selected staff member.
            </div>

            {/* Shift Details */}
            <div className="flex flex-col border rounded p-3 bg-[#F9FAFB] border-[#E6E6E6] gap-6">
              <div className="flex text-sm font-bold leading-[20px]">Shift Details</div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-[131px]">
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Client</p>
                  <p className="font-bold text-sm leading-5">{selectedShift?.clientName}</p>
                </div>
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Report Number</p>
                  <p className="font-bold text-sm leading-5">#S001</p>
                </div>
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Date</p>
                  <p className="font-bold text-sm leading-5">{selectedShift?.dateKey}</p>
                </div>
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Time</p>
                  <p className="font-bold text-sm leading-5">{selectedShift?.startTime} - {selectedShift?.endTime}</p>
                </div>
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Category</p>
                  <p className="font-bold text-sm leading-5">{selectedShift?.categoryName}</p>
                </div>
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Type</p>
                  <p className="font-bold text-sm leading-5">Regular</p>
                </div>
                <div className="flex flex-col">
                  <p className="font-normal text-sm leading-5">Location</p>
                  <p className="font-bold text-sm leading-5">{selectedShift?.Location}</p>
                </div>
              </div>
            </div>

            {/* Dropdown for Staff Member */}
            <div className="flex flex-col gap-[6px] relative">
              <label className="text-sm leading-5 font-bold">Transfer to Staff Member</label>
              <select
                value={selectedStaff?.id || ""}
                onChange={(e) => {
                  const staff = staffList.find((s) => s.id === e.target.value);
                  setSelectedStaff(staff || null);
                }}
                className="w-full border border-light-gray rounded px-3 py-2 bg-[#F3F3F5] appearance-none"
              >
                <option value="">Select staff member to transfer this shift to...</option>

                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name || staff.fullName || staff.email}
                  </option>
                ))}
              </select>

              <span className="absolute right-3 top-[64%] -translate-y-1/2 pointer-events-none">
                <FaChevronDown className="text-light-green w-4 h-4" />
              </span>
            </div>

            {/* <div className="flex flex-col gap-[6px]">
              <label className="text-sm leading-5 font-bold">Report Reference Number</label>
              <p className="font-normal text-sm leading-5">01111</p>
            </div> */}

            {/* Reason */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-sm font-bold">Reason for Transfer</label>
              <textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Please provide a detailed reason for this transfer request (e.g., illness, emergency, scheduling conflict)..."
                className="w-full border border-light-gray rounded p-[10px] h-24 placeholder:text-[#72787E] placeholder:font-normal placeholder:text-sm"
              />
            </div>

            {/* Transfer Button */}
            <div className="flex items-center justify-center">
              <button
                 onClick={handleTransferShift}
                className="flex items-center justify-center gap-[10px] bg-[#1D5F33] text-white py-2 px-3 w-fit rounded hover:bg-[#144527]"
              >
                <BiTransfer /> Transfer Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserShiftsData;
