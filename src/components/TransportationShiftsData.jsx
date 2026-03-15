import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

/** Inline label+value cell: truncates at max width, full text on hover */
const TruncField = ({ label, value, maxW = "max-w-[130px]" }) => {
    const display = value || "N/A";
    return (
        <div className={`flex-shrink-0 ${maxW}`}>
            <p className="text-[14px] whitespace-nowrap overflow-hidden text-ellipsis" title={display}>
                <span className="font-normal">{label}: </span>
                <span className="font-bold">{display}</span>
            </p>
        </div>
    );
};

const TransportationShiftsData = ({ filteredShifts, openTransportDetails }) => {
    const [intakeForms, setIntakeForms] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

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
    const transportationData = filteredShifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
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

    const getFlag = (shift, key) => {
        if (shift.transportation && key in shift.transportation) {
            return !!shift.transportation[key];
        }
        return false;
    };

    const getProgressItems = (shift, clientForm) => {
        const hasVisit = clientForm?.visitAddress && clientForm.visitAddress.trim() !== "";
        const items = [
            { key: "pickup", label: "Pickup", done: getFlag(shift, "pickupDone") },
        ];
        if (hasVisit) {
            items.push({ key: "visit", label: "Visit", done: getFlag(shift, "visitDone") });
        }
        items.push({ key: "drop", label: "Drop", done: getFlag(shift, "dropDone") });
        return items;
    };

    const getShiftStatus = (clockIn, clockOut) => {
        if (clockIn && clockOut) return "Completed";
        if (clockIn && !clockOut) return "Ongoing";
        return "Incomplete";
    };

    const handleViewReport = (shiftId) => {
        if (!shiftId) return;
        navigate(`/admin-dashboard/shift-report/${shiftId}`);
    };

    const handleEditShift = (shiftId) => {
        if (!shiftId) return;
        navigate(`/admin-dashboard/add/update-user-shift/${shiftId}`);
    };

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
        if (start && end && end !== "–" && start !== "N/A") return `${start} – ${end}`;
        if (start && start !== "N/A") return start;
        return "N/A";
    };

    const addressClass =
        "font-bold max-w-[220px] truncate whitespace-nowrap overflow-hidden text-ellipsis inline-block align-bottom";

    return (
        <div className="flex flex-col gap-[24px] w-full">
            {transportationData.map((shift) => {
                const clientName = shift.clientName || shift.clientDetails?.name || "";
                const clientForm = intakeForms[clientName] || {};
                const primaryPoint =
                    Array.isArray(shift.shiftPoints) && shift.shiftPoints.length > 0
                        ? shift.shiftPoints[0]
                        : Array.isArray(shift.clientDetails?.shiftPoints) && shift.clientDetails.shiftPoints.length > 0
                            ? shift.clientDetails.shiftPoints[0]
                            : {};

                const status = getShiftStatus(shift.clockIn, shift.clockOut);
                const isCompleted = status === "Completed";

                const pickupAddress =
                    primaryPoint?.pickupLocation || clientForm.pickupAddress || shift.pickupLocation || "N/A";
                const pickupTime =
                    primaryPoint?.pickupTime || clientForm.pickupTime || shift.pickupTime || "N/A";

                const visitAddress =
                    primaryPoint?.visitLocation || clientForm.visitAddress || shift.visitLocation || "";
                const arrivedVisitTime =
                    shift.transportation?.visitTime ||
                    primaryPoint?.visitStartOfficialTime ||
                    clientForm.visitArrivalTime ||
                    "N/A";
                const visitEndTime = primaryPoint?.visitEndOfficialTime || clientForm.visitEndTime || "N/A";
                const visitDuration = buildRangeLabel(arrivedVisitTime, visitEndTime);

                const dropAddress =
                    primaryPoint?.dropLocation || clientForm.dropOffAddress || shift.dropLocation || "N/A";
                const dropTime =
                    shift.transportation?.dropTime ||
                    primaryPoint?.dropTime ||
                    clientForm.dropOffTime ||
                    shift.dropTime ||
                    "N/A";

                const progressItems = getProgressItems(shift, clientForm);

                return (
                    <div key={shift.id} className="flex flex-col gap-[10px] p-[16px] rounded-[4px] bg-white">
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
                                            <span className={addressClass} title={pickupAddress}>{pickupAddress}</span>
                                        </p>
                                        <p className="font-normal text-[14px]">
                                            Pick Up Time: <span className="font-bold">{pickupTime}</span>
                                        </p>
                                    </div>

                                    {/* VISIT */}
                                    {visitAddress && visitAddress.trim() !== "" && (
                                        <div className="text-center">
                                            <p className="font-normal text-[14px]">
                                                Visit Address:
                                                <span className={addressClass} title={visitAddress}>{visitAddress}</span>
                                            </p>
                                            <p className="font-normal text-[12px]">
                                                Visit Duration:<span className="font-bold"> {visitDuration}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* DROP */}
                                    <div className="text-right">
                                        <p className="font-normal text-[14px]">
                                            Drop Off Address:
                                            <span className={addressClass} title={dropAddress}>{dropAddress}</span>
                                        </p>
                                        <p className="font-normal text-[14px]">
                                            Drop Off Time: <span className="font-bold">{dropTime}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* PROGRESS */}
                                <div className="flex flex-col gap-[8px]">
                                    <div className="flex items-center w-full">
                                        {progressItems.map((item, idx, arr) => (
                                            <React.Fragment key={item.key}>
                                                <img
                                                    src={item.done ? "/images/complete.png" : "/images/incomplete.png"}
                                                    alt={item.label}
                                                />
                                                {idx < arr.length - 1 && (
                                                    <div
                                                        className={`flex-1 border-t-2 ${item.done ? "border-green-800" : "border-gray-300"}`}
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
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-3 text-[14px] min-w-0 overflow-hidden">
                                <TruncField label="Client Name" value={shift.clientName || shift.clientDetails?.name} maxW="max-w-[140px]" />
                                <div className="w-px h-5 bg-gray-400 flex-shrink-0" />

                                <TruncField label="Client ID" value={shift.clientId || shift.clientDetails?.id} maxW="max-w-[170px]" />
                                <div className="w-px h-5 bg-gray-400 flex-shrink-0" />

                                <TruncField label="Seat Type" value={clientForm.typeOfSeat} maxW="max-w-[160px]" />
                                <div className="w-px h-5 bg-gray-400 flex-shrink-0" />

                                <TruncField label="Staff Name" value={shift.name || shift.user} maxW="max-w-[140px]" />
                                <div className="w-px h-5 bg-gray-400 flex-shrink-0" />

                                <TruncField
                                    label="Shift Date"
                                    value={
                                        shift.startDate
                                            ? new Date(shift.startDate?.toDate ? shift.startDate.toDate() : shift.startDate)
                                                .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                            : null
                                    }
                                    maxW="max-w-[140px]"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <div className="flex text-light-green font-medium text-sm gap-3">
                                    <div
                                        className={`${isCompleted ? "cursor-pointer text-light-green" : "cursor-pointer text-gray-400"}`}
                                        onClick={() => handleViewReport(shift.id)}
                                    >
                                        View Report
                                    </div>
                                    <div
                                        className="font-medium cursor-pointer text-light-green"
                                        onClick={() => handleEditShift(shift.id)}
                                    >
                                        Edit Shift
                                    </div>
                                    <div className="cursor-pointer" onClick={() => openInGoogleMaps(shift, clientForm)}>
                                        View in Maps
                                    </div>
                                    <div className="cursor-pointer" onClick={() => openTransportDetails(shift)}>
                                        View More
                                    </div>
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
            })}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-end items-center gap-1 py-[10px] px-4 rounded">
                    <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white">«</button>
                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white">‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                        .map((page) => (
                            <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`px-3 py-1 border border-[#C5C5C5] rounded ${currentPage === page ? "bg-light-green text-white" : "bg-white"}`}
                            >
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

export default TransportationShiftsData;
