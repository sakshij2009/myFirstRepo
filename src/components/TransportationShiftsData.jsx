import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const TransportationShiftsData = ({ filteredShifts, openTransportDetails }) => {
  const [intakeForms, setIntakeForms] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate(); // ✅ Add navigate for routing

  // Fetch intake forms
  useEffect(() => {
    const fetchIntakeForms = async () => {
      if (!filteredShifts || filteredShifts.length === 0) return;

      const snapshot = await getDocs(collection(db, "InTakeForms"));
      const forms = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.inTakeClients)) {
          data.inTakeClients.forEach((client) => {
            if (client.name) forms[client.name] = client;
          });
        }
      });

      setIntakeForms(forms);
    };
    fetchIntakeForms();
  }, [filteredShifts]);

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredShifts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const transportationData = filteredShifts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const getFlag = (shift, key) => {
    if (shift.transportation && key in shift.transportation) {
      return !!shift.transportation[key];
    }
    return false;
  };

  const getProgressItems = (shift, clientForm) => {
    const hasVisit =
      clientForm?.visitAddress && clientForm.visitAddress.trim() !== "";

    const items = [
      { key: "pickup", label: "Pickup", done: getFlag(shift, "pickupDone") },
    ];

    if (hasVisit) {
      items.push({
        key: "visit",
        label: "Visit",
        done: getFlag(shift, "visitDone"),
      });
    }

    items.push({
      key: "drop",
      label: "Drop",
      done: getFlag(shift, "dropDone"),
    });

    return items;
  };

  // ✅ Check shift completion (same logic as User Shifts)
  const getShiftStatus = (clockIn, clockOut) => {
    if (clockIn && clockOut) return "Completed";
    if (clockIn && !clockOut) return "Ongoing";
    return "Incomplete";
  };

  // ✅ View report navigation (same as ShiftsData)
  const handleViewReport = (shiftId) => {
    if (!shiftId) return;
    navigate(`/admin-dashboard/shift-report/${shiftId}`);
  };
   const handleEditShift = (shiftId) => {
    if (!shiftId) return;
    navigate(`/admin-dashboard/add/update-user-shift/${shiftId}`);
  };

  // Open Google Maps
  const openInGoogleMaps = (shift, clientForm) => {
    const pickupAddress = clientForm.pickupAddress || shift.pickupLocation || "";

    const dropAddress =
      clientForm.dropOffAddress ||
      clientForm.dropoffAddress ||
      clientForm.dropAddress ||
      clientForm.dropLocation ||
      shift.dropOffAddress ||
      shift.dropLocation ||
      "";

    const visitAddress = clientForm.visitAddress || shift.visitLocation || "";

    if (!pickupAddress || !dropAddress) {
      alert("Missing pickup or drop address");
      return;
    }

    const origin = encodeURIComponent(pickupAddress);
    const destination = encodeURIComponent(dropAddress);

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

    if (visitAddress.trim() !== "") {
      url += `&waypoints=${encodeURIComponent(visitAddress)}`;
    }

    window.open(url, "_blank");
  };

  const buildRangeLabel = (start, end) => {
    if (start && end && end !== "–" && start !== "N/A") {
      return `${start} – ${end}`;
    }
    if (start && start !== "N/A") return start;
    return "N/A";
  };

  const addressClass =
    "font-bold max-w-[220px] truncate whitespace-nowrap overflow-hidden text-ellipsis inline-block align-bottom";

  return (
    <div className="flex flex-col gap-[24px] w-full">
      {transportationData.map((shift) => {
  const clientName = shift.clientName || shift.clientDetails?.name || "";
  const clientId = shift.clientId || shift.clientDetails?.id || "";
  const staffName =
    shift.name || shift.staffName || shift.user || "N/A";

  const clientForm = intakeForms[clientName] || {};
 const primaryPoint =
  Array.isArray(shift.shiftPoints) && shift.shiftPoints.length > 0
    ? shift.shiftPoints[0]
    : Array.isArray(shift.clientDetails?.shiftPoints) && shift.clientDetails.shiftPoints.length > 0
    ? shift.clientDetails.shiftPoints[0]
    : {};

        // Determine shift completion status
        const status = getShiftStatus(shift.clockIn, shift.clockOut);
        const isCompleted = status === "Completed"; // ✅ Only allow report view when completed

        // ----- PICKUP -----
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

        // ----- VISIT -----
        const visitAddress =
          primaryPoint?.visitLocation ||
          clientForm.visitAddress ||
          shift.visitLocation ||
          "";

        const arrivedVisitTime =
          shift.transportation?.visitTime ||
          primaryPoint?.visitStartOfficialTime ||
          clientForm.visitArrivalTime ||
          "N/A";

        const visitEndTime =
          primaryPoint?.visitEndOfficialTime ||
          clientForm.visitEndTime ||
          "N/A";

        const visitDuration = buildRangeLabel(arrivedVisitTime, visitEndTime);

        // ----- DROP -----
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

        const progressItems = getProgressItems(shift, clientForm);

        return (
          <div
            key={shift.id}
            className="flex flex-col gap-[10px] p-[16px] rounded-[4px] bg-white"
          >
            {/* Top row */}
            <div className="flex justify-between w-full">
              <img src="/images/carImage.png" alt="" />

              <div className="flex flex-col gap-[12px] w-full px-2">
                {/* Pickup - Visit - Drop */}
                <div className="flex justify-between text-light-black">
                  {/* PICKUP */}
                  <div>
                    <p className="font-normal text-[14px]">
                      Pick Up Address:
                      <span className={addressClass} title={pickupAddress}>
                        {pickupAddress}
                      </span>
                    </p>
                    <p className="font-normal text-[14px]">
                      Pick Up Time:{" "}
                      <span className="font-bold">{pickupTime}</span>
                    </p>
                  </div>

                  {/* VISIT */}
                  {visitAddress && visitAddress.trim() !== "" && (
                    <div className="text-center">
                      <p className="font-normal text-[14px]">
                        Visit Address:
                        <span className={addressClass} title={visitAddress}>
                          {visitAddress}
                        </span>
                      </p>

                      <p className="font-normal text-[12px]">
                        Visit Duration:
                        <span className="font-bold"> {visitDuration}</span>
                      </p>
                    </div>
                  )}

                  {/* DROP */}
                  <div className="text-right">
                    <p className="font-normal text-[14px]">
                      Drop Off Address:
                      <span className={addressClass} title={dropAddress}>
                        {dropAddress}
                      </span>
                    </p>

                    <p className="font-normal text-[14px]">
                      Drop Off Time:{" "}
                      <span className="font-bold">{dropTime}</span>
                    </p>
                  </div>
                </div>

                {/* PROGRESS */}
                <div className="flex flex-col gap-[8px]">
                  <div className="flex items-center w-full">
                    {progressItems.map((item, idx, arr) => (
                      <React.Fragment key={item.key}>
                        <img
                          src={
                            item.done
                              ? "/images/complete.png"
                              : "/images/incomplete.png"
                          }
                          alt={item.label}
                        />
                        {idx < arr.length - 1 && (
                          <div
                            className={`flex-1 border-t-2 ${
                              item.done ? "border-green-800" : "border-gray-300"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex justify-between text-light-black">
                    {progressItems.map((item) => (
                      <div key={item.key} className="font-bold text-[14px]">
                        {item.done ? "Completed" : "Incomplete"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <img src="/images/carImage.png" alt="" />
            </div>

            <hr className="border-t border-gray-300" />

            {/* Footer */}
            <div className="flex justify-between">
              <div className="flex gap-[9px] text-[14px]">
                <p>
                  Client Name:{" "}
                  <span className="font-bold">{shift.clientName || shift.clientDetails?.name}</span>
                </p>
                <div className="w-px h-6 bg-gray-400" />

                <p>
                  Client ID: <span className="font-bold">{shift.clientId || shift.clientDetails?.id}</span>
                </p>
                <div className="w-px h-6 bg-gray-400" />

                <p>
                  Seat Type:{" "}
                  <span className="font-bold">
                    {clientForm.typeOfSeat || "N/A"}
                  </span>
                </p>
                <div className="w-px h-6 bg-gray-400" />

                <p>
                  Staff Name:{" "}
                  <span className="font-bold">
                    {shift.name || shift.user || "N/A"}
                  </span>
                </p>
              </div>

              {/* ✅ Actions */}
              <div className="flex text-light-green font-medium text-sm gap-3">
                <div
                  className={`${
                    isCompleted
                      ? "cursor-pointer text-light-green"
                      : "cursor-not-allowed text-gray-400"
                  }`}
                  onClick={() => isCompleted && handleViewReport(shift.id)}
                >
                  View Report
                </div>
                 <div
                      className={" font-medium cursor-pointer text-light-green "}
                      onClick={() => handleEditShift(shift.id)
                      }
                    >
                      Edit Shift
                    </div>

                <div
                  className="cursor-pointer"
                  onClick={() => openInGoogleMaps(shift, clientForm)}
                >
                  View in Maps
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => openTransportDetails(shift)}
                >
                  View More
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransportationShiftsData;
