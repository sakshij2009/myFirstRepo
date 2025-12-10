import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { sendNotification } from "../utils/notificationHelper";
import { VscDebugStart } from "react-icons/vsc";
import { useNavigate } from "react-router-dom";

const UserTransportationShifts = ({ filteredShifts }) => {
  const [intakeForms, setIntakeForms] = useState({});
  const [watchId, setWatchId] = useState(null);
  const [activeShiftId, setActiveShiftId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ----------------------------------------------------------
  // Load Intake Forms
  // ----------------------------------------------------------
  useEffect(() => {
    const fetchIntakeForms = async () => {
      if (!filteredShifts || filteredShifts.length === 0) return;

      const snap = await getDocs(collection(db, "InTakeForms"));
      const formsByClientName = {};

      snap.forEach((d) => {
        const data = d.data();
        if (Array.isArray(data.inTakeClients)) {
          data.inTakeClients.forEach((client) => {
            if (client.name) {
              formsByClientName[client.name.trim()] = client;
            }
          });
        }
      });

      setIntakeForms(formsByClientName);
    };

    fetchIntakeForms();
  }, [filteredShifts]);

  const navigate = useNavigate();
  const handleViewReport = (shiftId) => {
    navigate(`/user-dashboard/shift-report/${shiftId}`);
  };

  // ----------------------------------------------------------
  // Fetch Admin ID for notifications
  // ----------------------------------------------------------
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "admin"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdminId(snap.docs[0].id);
        }
      } catch (err) {
        console.error("Error fetching admin:", err);
      }
    };

    fetchAdmin();
  }, []);

  // ----------------------------------------------------------
  // Flag helper
  // ----------------------------------------------------------
  const getFlag = (shift, key) => {
    if (shift.transportation && key in shift.transportation) {
      return !!shift.transportation[key];
    }
    return false;
  };

  // ----------------------------------------------------------
  // Steps generator
  // ----------------------------------------------------------
  const buildSteps = (shift, clientForm, primaryPoint) => {
    const hasVisit =
      !!clientForm?.visitAddress || !!primaryPoint?.visitLocation;

    const steps = [
      { key: "pickup", label: "Pickup", done: getFlag(shift, "pickupDone") },
    ];

    if (hasVisit) {
      steps.push({
        key: "visit",
        label: "Visit",
        done: getFlag(shift, "visitDone"),
      });
    }

    steps.push({
      key: "drop",
      label: "Drop",
      done: getFlag(shift, "dropDone"),
    });

    return steps;
  };

  const getStatusLabelForStep = (steps, idx) => {
    const step = steps[idx];
    if (step.done) return "Completed";
    if (idx > 0 && steps[idx - 1].done) return "InProgress";
    return "Incomplete";
  };

  // ----------------------------------------------------------
  // Haversine distance calculation
  // ----------------------------------------------------------
  const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    if (
      lat1 == null ||
      lon1 == null ||
      lat2 == null ||
      lon2 == null ||
      Number.isNaN(lat1) ||
      Number.isNaN(lon1) ||
      Number.isNaN(lat2) ||
      Number.isNaN(lon2)
    )
      return 0;

    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371e3;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ----------------------------------------------------------
  // START RIDE
  // ----------------------------------------------------------
  const handleStartRide = async (shift, clientForm, primaryPoint) => {
    try {
      const shiftRef = doc(db, "shifts", String(shift.id));

      // Mark ride started
      await updateDoc(shiftRef, {
        "transportation.driveStarted": true,
        "transportation.driveStartTime": new Date().toISOString(),
        "transportation.totalDistance": 0, // initialize distance
        "transportation.lastLat": null,
        "transportation.lastLng": null,
      });

      shift.transportation = {
        ...(shift.transportation || {}),
        driveStarted: true,
        totalDistance: 0,
        lastLat: null,
        lastLng: null,
      };

      setActiveShiftId(shift.id);

      // GPS tracking
      if (!navigator.geolocation) {
        alert("Location not supported");
        return;
      }

      const watch = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          let lastLat = shift.transportation.lastLat;
          let lastLng = shift.transportation.lastLng;

          let newDistance = shift.transportation.totalDistance || 0;

          // Only add if we have a last coordinate
          if (lastLat != null && lastLng != null) {
            const delta = getDistanceMeters(lastLat, lastLng, latitude, longitude);
            if (delta < 500) {
              newDistance += delta; // ignore abnormal jumps
            }
          }

          await updateDoc(shiftRef, {
            "transportation.currentLat": latitude,
            "transportation.currentLng": longitude,
            "transportation.totalDistance": newDistance,
            "transportation.lastLat": latitude,
            "transportation.lastLng": longitude,
          });

          shift.transportation.lastLat = latitude;
          shift.transportation.lastLng = longitude;
          shift.transportation.totalDistance = newDistance;

          // Auto-detect pickup / visit / drop remains unchanged
        },
        (err) => {
          console.error("GPS error:", err);
          alert("Enable GPS to continue.");
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      setWatchId(watch);
    } catch (err) {
      console.error("Error starting ride:", err);
      alert("Could not start ride.");
    }
  };

  // ----------------------------------------------------------
  // END RIDE
  // ----------------------------------------------------------
  const handleEndRide = async (shift) => {
    try {
      const shiftRef = doc(db, "shifts", String(shift.id));

      await updateDoc(shiftRef, {
        "transportation.driveEnded": true,
        "transportation.driveEndTime": new Date().toISOString(),
      });

      shift.transportation.driveEnded = true;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      setActiveShiftId(null);
    } catch (err) {
      console.error("End ride error:", err);
      alert("Could not end ride.");
    }
  };

  // ----------------------------------------------------------
  // CANCEL SHIFT
  // ----------------------------------------------------------
  const handleCancelRide = async (shift) => {
    try {
      const shiftRef = doc(db, "shifts", String(shift.id));

      await updateDoc(shiftRef, {
        shiftCancelled: true,
        shiftCancelledAt: new Date().toISOString(),
        "transportation.rideCancelled": true,
      });

      shift.shiftCancelled = true;
      shift.transportation.rideCancelled = true;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      setActiveShiftId(null);
    } catch (err) {
      console.error("Cancel error:", err);
    }
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  if (!filteredShifts || filteredShifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <p className="text-lg font-semibold">No Transportation Shifts Found</p>
      </div>
    );
  }

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const filteredShift = filteredShifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] w-full">
      {filteredShift.map((shift) => {
        const primaryPoint = Array.isArray(shift.shiftPoints)
          ? shift.shiftPoints[0]
          : null;

        const clientName =
          primaryPoint?.name || shift.clientName || shift.childName || "";

        const clientForm =
          (clientName && intakeForms[clientName.trim()]) || {};

        const pickupAddress =
          primaryPoint?.pickupLocation ||
          clientForm.pickupAddress ||
          shift.pickupLocation ||
          "N/A";

        const pickupTime =
          primaryPoint?.pickupTime ||
          clientForm.pickupTime ||
          shift.pickupTime ||
          "N/A";

        const visitAddress =
          primaryPoint?.visitLocation ||
          clientForm.visitAddress ||
          shift.visitLocation ||
          "";

        const dropAddress =
          primaryPoint?.dropLocation ||
          clientForm.dropOffAddress ||
          shift.dropLocation ||
          "N/A";

        const dropTime =
          shift.transportation?.dropTime ||
          primaryPoint?.dropTime ||
          clientForm.dropOffTime ||
          shift.dropTime ||
          "N/A";

        const seatType =
          primaryPoint?.seatType || clientForm.typeOfSeat || "N/A";

        const transportMode =
          primaryPoint?.transportationMode ||
          clientForm.transportationMode ||
          "N/A";

        const staffName = shift.name || shift.username || "N/A";

        const steps = buildSteps(shift, clientForm, primaryPoint);

        const driveStarted = getFlag(shift, "driveStarted");
        const driveEnded = getFlag(shift, "driveEnded");
        const rideCancelled = getFlag(shift, "rideCancelled");
        const shiftCancelled = !!shift.shiftCancelled;

        return (
          <div
            key={shift.id}
            className="flex flex-col gap-[10px] p-[16px] rounded-[4px] bg-white"
          >
            {/* TOP ROW */}
            <div className="flex justify-between w-full">
              <img src="/images/carImage.png" alt="car" />

              <div className="flex flex-col gap-[12px] w-full px-2">
                <div className="flex justify-between text-light-black">

                  {/* PICKUP */}
                  <div className="flex flex-col gap-[4px]">
                    <div className="flex gap-[4px] text-[14px] leading-[20px]">
                      <p className="font-normal">Pick Up Address:</p>
                      <p
                        className="font-bold truncate max-w-[220px]"
                        title={pickupAddress}
                      >
                        {pickupAddress}
                      </p>
                    </div>

                    <div className="flex gap-[4px] text-[14px] leading-[20px]">
                      <p className="font-normal">Pick Up Time:</p>
                      <p className="font-bold">{pickupTime}</p>
                    </div>
                  </div>

                  {/* VISIT */}
                  {visitAddress && visitAddress.trim() !== "" && (
                    <div className="flex flex-col gap-[4px]">
                      <div className="flex gap-[4px] text-[14px] leading-[20px]">
                        <p className="font-normal">Visit Address:</p>
                        <p
                          className="font-bold truncate max-w-[220px]"
                          title={visitAddress}
                        >
                          {visitAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* DROP */}
                  <div className="flex flex-col gap-[4px] items-end">
                    <div className="flex gap-[4px] text-[14px] leading-[20px]">
                      <p className="font-normal">Drop Off Address:</p>
                      <p
                        className="font-bold truncate max-w-[220px]"
                        title={dropAddress}
                      >
                        {dropAddress}
                      </p>
                    </div>

                    <div className="flex gap-[4px] text-[14px] leading-[20px]">
                      <p className="font-normal">Drop Off Time:</p>
                      <p className="font-bold">{dropTime}</p>
                    </div>
                  </div>
                </div>

                {/* PROGRESS LINE */}
                <div className="flex flex-col gap-[8px]">
                  <div className="flex items-center w-full">
                    {steps.map((step, idx) => (
                      <React.Fragment key={step.key}>
                        <div className="flex items-center">
                          <img
                            src={
                              step.done
                                ? "/images/complete.png"
                                : "/images/incomplete.png"
                            }
                            alt={step.label}
                          />
                        </div>

                        {idx < steps.length - 1 && (
                          <div
                            className={`flex-1 border-t-2 ${
                              step.done
                                ? "border-green-800"
                                : "border-gray-300"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex justify-between text-light-black">
                    {steps.map((_, idx) => (
                      <div
                        key={idx}
                        className="text-[14px] font-bold min-w-[80px] text-center"
                      >
                        {getStatusLabelForStep(steps, idx)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <img src="/images/carImage.png" alt="car" />
            </div>

            <hr className="border-t border-gray-300" />

            {/* FOOTER */}
            <div className="flex justify-between items-center">
              <div className="flex gap-[9px] text-[14px] leading-[20px] flex-wrap">
                <div className="flex gap-[4px]">
                  <p className="font-normal">Client Name:</p>
                  <p className="font-bold">{clientName || "N/A"}</p>
                </div>

                <div className="w-px h-6 bg-gray-400" />

                <div className="flex gap-[4px]">
                  <p className="font-normal">Client ID:</p>
                  <p className="font-bold">
                    {primaryPoint?.id || shift.clientId || "N/A"}
                  </p>
                </div>

                <div className="w-px h-6 bg-gray-400" />

                <div className="flex gap-[4px]">
                  <p className="font-normal">Seat Type:</p>
                  <p className="font-bold">{seatType}</p>
                </div>

                <div className="w-px h-6 bg-gray-400" />

                <div className="flex gap-[4px]">
                  <p className="font-normal">Transportations:</p>
                  <p className="font-bold">{transportMode}</p>
                </div>

                <div className="w-px h-6 bg-gray-400" />

                <div className="flex gap-[4px]">
                  <p className="font-normal">Staff Name:</p>
                  <p className="font-bold">{staffName}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                {!shiftCancelled && (
                  <>
                    {!driveStarted && !rideCancelled && (
                      <button
                        onClick={() =>
                          handleStartRide(shift, clientForm, primaryPoint)
                        }
                        className="px-4 py-2 rounded bg-dark-green text-white text-sm font-medium hover:bg-green-700"
                      >
                        Start Ride
                      </button>
                    )}

                    {driveStarted && !driveEnded && !rideCancelled && (
                      <button
                        onClick={() => handleEndRide(shift)}
                        className="px-4 py-2 rounded bg-[#FF8A00] text-white text-sm font-medium hover:bg-[#e07600]"
                      >
                        End Ride
                      </button>
                    )}

                   {/* Make Report Button */}
                        <div
                          onClick={() => handleViewReport(shift.id)}
                          className={`flex items-center gap-2 px-3 py-[6px] border rounded-[6px] font-medium text-[14px] leading-[20px]
                            ${shift.shiftConfirmed ? "border-[#1D5F33] text-[#1D5F33] bg-white hover:bg-[#e6f5ea] cursor-pointer" : "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"}`}
                        >
                          <VscDebugStart className="text-[18px]" />
                          <p>Make Report</p>
                        </div>                

                    {!rideCancelled && !driveEnded && (
                      <button
                        onClick={() => handleCancelRide(shift)}
                        className="px-4 py-2 rounded border border-gray-400 text-gray-700 text-sm font-medium hover:bg-gray-100"
                      >
                        Cancel Shift
                      </button>
                    )}
                  </>
                )}

                {(shiftCancelled || rideCancelled || driveEnded) && (
                  <span className="text-sm font-semibold text-gray-600">
                    {shiftCancelled
                      ? "Shift Cancelled"
                      : rideCancelled
                      ? "Ride Cancelled"
                      : "Ride Completed"}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
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
    </div>
    
  );
};

export default UserTransportationShifts;
