import React, { useState } from "react";
import { CgProfile } from "react-icons/cg";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import ShiftLockToggle from "./ShiftLockToggle";
import { generateShiftReportPDF } from "../components/GenerateShiftReportPDF";



const ShiftsData = ({ filteredShifts = [], isAdmin = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // ─── Edit Clock State ────────────────────────────────────────────────────
  // Removed: now handled inside the Report modal.

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getShift = (isConfirmed) => {
    if (isConfirmed) {
      return (
        <span className="px-2 py-1 text-[#2D8C0C] bg-[#E5FFD3] rounded-[8px] font-bold text-sm border border-[#AAFA69]">
          Confirmed
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-[#C70036] bg-[#FFF1F2] rounded-[8px] font-bold text-sm border border-[#FFCCD3]">
        Unconfirmed
      </span>
    );
  };

  // Helper to determine shift status
  const getShiftStatus = (clockIn, clockOut) => {
    if (clockIn && clockOut) return "Completed";
    if (clockIn && !clockOut) return "Ongoing";
    return "Incomplete";
  };

  // Style based on shift status
  const getStatusStyles = (status) => {
    switch (status) {
      case "Completed":
        return "bg-lime text-fonts border border-parrot-green px-[8px] py-[4px] rounded-[8px] font-medium text-[14px] leading-[16px]";
      case "Ongoing":
        return "bg-[#FEE9EE] text-[#940730] border border-[#FCA7BC] px-[8px] py-[4px] rounded-[8px] font-medium text-[14px] leading-[16px]";
      case "Incomplete":
        return "bg-[#EAEEF2] text-[#54585D] border border-[#C8C9C9] px-[8px] py-[4px] rounded-[8px] font-medium text-[14px] leading-[16px]";
      default:
        return "";
    }
  };

  // Style based on shift category
  const getShiftCategoryStyle = (category) => {
    switch (category) {
      case "Emergent Care":
        return "flex bg-[#FFF1F2] border border-[#FFCCD3] rounded-[8px] py-1 px-2 text-[#C70036] font-bold text-[14px] leading-[140%] w-[115px]";
      case "Supervised Visitation":
        return "flex bg-[#FFFBEB] border border-[#FEE685] rounded-[8px] py-1 px-2 text-[#BF4D00] font-bold text-[14px] leading-[140%]";
      case "Respite Care":
        return "flex bg-[#ECFEFF] border border-[#A2F4FD] rounded-[8px] py-1 px-2 text-[#007595] font-bold text-[14px] leading-[140%]";
      default:
        return "truncate font-bold text-[14px] leading-[140%]";
    }
  };

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

  // ─── Edit Clock handlers ─────────────────────────────────────────────────
  // Handlers moved directly into the view report (ReportsSection) component

  // ─── Cancel Shift handler ─────────────────────────────────────────────────
  const handleCancelShift = async (shift) => {
    if (!window.confirm("Are you sure you want to cancel this shift? Clock in/out will be set automatically.")) return;

    try {
      // Parse shift start and end times to compute duration
      const shiftDate =
        typeof shift.startDate?.toDate === "function"
          ? shift.startDate.toDate()
          : new Date(shift.startDate);

      const [startH, startM] = (shift.startTime || "00:00").split(":").map(Number);
      const [endH, endM] = (shift.endTime || "00:00").split(":").map(Number);

      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(startH, startM, 0, 0);

      const shiftEnd = new Date(shiftDate);
      shiftEnd.setHours(endH, endM, 0, 0);
      // Handle overnight shifts
      if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

      const durationHrs = (shiftEnd - shiftStart) / (1000 * 60 * 60);

      let autoClockIn = shiftStart.toISOString();
      let autoClockOut;

      if (durationHrs <= 3) {
        // Use actual shift end time
        autoClockOut = shiftEnd.toISOString();
      } else {
        // Cap at 3 hours from start
        const cappedEnd = new Date(shiftStart.getTime() + 3 * 60 * 60 * 1000);
        autoClockOut = cappedEnd.toISOString();
      }

      await updateDoc(doc(db, "shifts", shift.id), {
        isCancelled: true,
        clockIn: autoClockIn,
        clockOut: autoClockOut,
      });

      alert("Shift cancelled. Clock in/out have been set automatically.");
    } catch (err) {
      console.error("Error cancelling shift:", err);
      alert("Failed to cancel shift.");
    }
  };

  // ─── Other action handlers ────────────────────────────────────────────────

  // Pagination
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredShifts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentShifts = filteredShifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleViewIntakeForm = async (intakeId, shift) => {
    // intakeId comes from shift.clientId initially, but for some records 
    // it's tucked inside clientDetails or explicitly labeled intakeFormId
    let directIntakeId = shift?.intakeFormId || intakeId || shift?.clientDetails?.id;

    if (!directIntakeId) {
      alert("Unable to find the associated Intake Form ID for this shift.");
      return;
    }

    // Client IDs created from Intake Forms often look like "family_1773001441203" or "1773001441203_0".
    // We need to strip those wrapping characters out to get the raw Intake Form timestamp ID.
    if (typeof directIntakeId === "string") {
      const match = directIntakeId.match(/(?:family_)?(\d+)(?:_\d+)?/);
      if (match && match[1]) {
        directIntakeId = match[1];
      }
    }

    const formType = "Intake Worker";

    navigate(`/admin-dashboard/add/update-intake-form/${directIntakeId}?type=${formType}`);
  };


  const handleViewReport = (shiftId) => {
    if (!shiftId) return;
    navigate(`/admin-dashboard/shift-report/${shiftId}`);
  };

  const handleEditShift = (shiftId) => {
    if (!shiftId) return;
    navigate(`/admin-dashboard/add/update-user-shift/${shiftId}`);
  };

  const handleDeleteShift = async (shiftId) => {
    if (!shiftId) return;
    if (!window.confirm("Are you sure you want to delete this shift? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "shifts", shiftId));
    } catch (err) {
      console.error("Error deleting shift:", err);
      alert("Failed to delete shift. Please try again.");
    }
  };

  const normalizeCategory = (category) => {
    const c = (category || "").toLowerCase().trim();

    // Anything that starts with supervised visitation should be treated as supervised visitation tab
    if (c.includes("supervised visitation")) return "Supervised Visitation";

    if (c.includes("emergent care")) return "Emergent Care";
    if (c.includes("respite care")) return "Respite Care";

    return category || "-";
  };


  return (
    <div className="flex flex-col gap-[24px] w-full ">

      {/* ─── Edit Clock Modal ─── (Removed) */}

      {currentShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <p className="text-lg font-semibold">No Shifts Found</p>
          <p className="text-sm text-gray-400">
            Looks like there are no shifts to display right now.
          </p>
        </div>
      ) : (
        currentShifts.map((shift) => {
          const status = getShiftStatus(shift.clockIn, shift.clockOut);
          const isCompleted = status === "Completed";



          return (
            <div
              key={shift.id}
              className={`flex flex-row bg-white h-[115px] justify-center items-center gap-[24px] py-3 px-4 rounded-[4px] ${shift.isCancelled ? "opacity-60 border border-orange-300" : ""}`}
            >
              <div className="flex items-center justify-center bg-gray-300 h-19 w-20 rounded-full overflow-hidden">
                {shift.image ? (
                  <img
                    src={shift.image}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img src="/images/profile.jpeg" />
                )}
              </div>

              <div className="flex flex-col w-full justify-center gap-[8px]">
                {/* Header */}
                <div className="flex flex-row justify-between text-[#2B3232] p-1">
                  <div className="flex flex-col gap-[2px]">
                    <div className="flex justify-start gap-[8px]">
                      <p className="font-normal text-[14px] leading-[20px]">Client</p>
                      <p className="font-bold text-[14px] leading-[20px]">
                        {shift.clientName || shift.clientDetails?.name || "-"}
                      </p>
                    </div>
                    <div className="flex justify-start gap-[8px]">
                      <p className="font-normal text-[14px] leading-[20px]">Client ID</p>
                      <p className="font-bold text-[14px] leading-[20px]">
                        {shift.clientId || shift.clientDetails?.id || "-"}
                      </p>
                    </div>
                    {shift.isCancelled && (
                      <span className="text-[11px] text-orange-600 font-semibold">● Cancelled</span>
                    )}
                  </div>

                  {/* Shift info */}
                  <div className="flex flex-row gap-[24px] justify-end">
                    <div>
                      <p className="font-normal text-[14px] leading-[20px]">Shift Date</p>
                      <p
                        className="font-bold text-[14px] leading-[20px] truncate"
                        title={formatDate(shift.startDate)}
                      >
                        {formatDate(shift.startDate)}
                      </p>
                    </div>


                    <div className="w-[120px]">
                      <p className="font-normal text-[14px] leading-[20px]">
                        Assign Caregiver
                      </p>
                      <p
                        className="font-bold text-[14px] leading-[20px] truncate"
                        title={shift.name}
                      >
                        {shift.name || shift.user || "-"}
                      </p>
                    </div>

                    <div className="gap-2">
                      <p className="flex font-normal text-[14px] leading-[20px]">Shift Category</p>
                      {(() => {
                        const rawCategory = shift.categoryName || shift.shiftCategory;
                        const normalized = normalizeCategory(rawCategory);

                        return (
                          <p
                            className={getShiftCategoryStyle(normalized)}
                            title={rawCategory}
                          >
                            {rawCategory || "-"}
                          </p>
                        );
                      })()}

                    </div>

                    <div className="w-[75px]">
                      <p className="font-normal text-[14px] leading-[20px]">Shift Type</p>
                      <p className="font-bold text-[14px] leading-[20px]">{shift.typeName || shift.shiftType}</p>
                    </div>

                    <div className="w-[80px]">
                      <p className="font-normal text-[14px] leading-[20px]">Status</p>
                      <span className={getStatusStyles(status)}>{status}</span>
                    </div>



                    <div className="w-[90px]">
                      <p className="flex font-normal text-[14px] leading-[20px]">Shift</p>
                      <p className="flex font-bold text-[14px] leading-[20px]">
                        {getShift(shift.shiftConfirmed)}
                      </p>
                    </div>

                    <div className="w-[120px]">
                      <p className="font-normal text-[14px] leading-[20px]">Agency</p>
                      <p
                        className="truncate font-bold text-[14px] leading-[20px]"
                        title={shift.agencyName || shift.clientDetails?.agencyName}
                      >
                        {shift.agencyName || shift.clientDetails?.agencyName || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-t border-dashed border-gray-300" />

                {/* Footer actions */}
                <div className="flex justify-between text-light-green text-[14px]">
                  <div className="flex items-center font-medium cursor-pointer"
                    onClick={() => handleViewIntakeForm(shift.clientId, shift)}
                  >
                    <p>View Intake Form</p>
                  </div>

                  <div className="flex gap-4">


                    <div className="flex gap-1 text-light-black">
                      <p className="font-bold">Shift Timeline:</p>
                      <p>{shift.startTime}-{shift.endTime}</p>
                    </div>

                    {/* 🔒 SHIFT LOCK TOGGLE WITH SAFE STATE */}
                    <ShiftLockToggle
                      shiftId={shift.id}
                      initialValue={shift.isRatify ?? false}
                      className={""}
                    />



                    {/* View Report */}
                    {/* View Report */}
                    <div
                      className="font-medium text-light-green cursor-pointer"
                      onClick={() => handleViewReport(shift.id)}
                    >
                      View Report
                    </div>



                    {/* Download Report */}
                    <div
                      className={` font-medium ${isCompleted ? "text-light-green cursor-pointer" : "text-[#72787E] cursor-not-allowed"
                        }`}
                      onClick={() => isCompleted && generateShiftReportPDF(shift)}
                    >
                      Download Report
                    </div>

                    {/* Edit Shift */}
                    <div
                      className={" font-medium cursor-pointer text-light-green "}
                      onClick={() => handleEditShift(shift.id)
                      }
                    >
                      Edit Shift
                    </div>

                    {/* Edit Clock (Removed) */}

                    {/* Cancel Shift */}
                    {!shift.isCancelled && (
                      <div
                        className="font-medium cursor-pointer text-orange-500"
                        onClick={() => handleCancelShift(shift)}
                      >
                        Cancel Shift
                      </div>
                    )}

                    {/* Delete Shift */}
                    <div
                      className="font-medium cursor-pointer text-red-500"
                      onClick={() => handleDeleteShift(shift.id)}
                    >
                      Delete Shift
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-1 py-[10px] px-4 rounded">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            «
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
            .map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 border border-[#C5C5C5] rounded ${currentPage === page ? "bg-light-green text-white" : "bg-white"
                  }`}
              >
                {page}
              </button>
            ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};

export default ShiftsData;
