import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const TransportationDetails = ({ shift, onClose }) => {
  if (!shift) return null;

  const [intakeForm, setIntakeForm] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch Intake Form for this client when the component mounts
  useEffect(() => {
    const fetchIntakeForm = async () => {
      try {
        const clientName =
          shift?.clientName ||
          shift?.clientDetails?.name ||
          shift?.clientDetails?.clientName;

        if (!clientName) {
          setLoading(false);
          return;
        }

        const snapshot = await getDocs(collection(db, "InTakeForms"));
        let foundClient = null;

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.inTakeClients)) {
            const match = data.inTakeClients.find(
              (c) =>
                c.name &&
                c.name.trim().toLowerCase() === clientName.trim().toLowerCase()
            );
            if (match) {
              foundClient = match;
            }
          }
        });

        setIntakeForm(foundClient);
      } catch (err) {
        console.error("Error fetching intake form:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntakeForm();
  }, [shift]);

  // ✅ Define primaryPoint like in TransportationShiftsData
  const primaryPoint =
    Array.isArray(shift.shiftPoints) && shift.shiftPoints.length > 0
      ? shift.shiftPoints[0]
      : Array.isArray(shift.clientDetails?.shiftPoints) &&
        shift.clientDetails.shiftPoints.length > 0
      ? shift.clientDetails.shiftPoints[0]
      : {};

  // ✅ Address resolution logic (matches main list)
  const pickupAddress =
    primaryPoint?.pickupLocation ||
    intakeForm?.pickupAddress ||
    shift?.pickupLocation ||
    shift?.clientDetails?.shiftPoints?.[0]?.pickupLocation ||
    "N/A";

  const visitAddress =
    primaryPoint?.visitLocation ||
    intakeForm?.visitAddress ||
    shift?.visitLocation ||
    shift?.clientDetails?.shiftPoints?.[0]?.visitLocation ||
    "N/A";

  const dropAddress =
    primaryPoint?.dropLocation ||
    intakeForm?.dropOffAddress ||
    shift?.dropLocation ||
    shift?.clientDetails?.shiftPoints?.[0]?.dropLocation ||
    "N/A";

  // ✅ Visit Duration (optional)
  const visitDuration =
    shift.visitDuration ||
    (shift.visitStartOfficialTime && shift.visitEndOfficialTime
      ? `${shift.visitStartOfficialTime} – ${shift.visitEndOfficialTime}`
      : "N/A");

  const receipts = shift.expenseReceiptUrlList || [];
  const kms = 0;
  const rate = shift.clientKMRate || shift.clientRate || 5.5;
  const totalCost = (kms * rate).toFixed(2);
  const addressClass =
    "truncate max-w-[270px] cursor-pointer text-sm font-medium";

  if (loading) {
    return (
      <div className="flex justify-center items-center w-[439px] h-full bg-white">
        <p className="text-gray-500">Loading intake details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-[439px] h-full bg-white p-5 overflow-y-auto text-light-black">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[24px] font-bold text-light-black">Transportation Details</h2>
        <button onClick={onClose} className="text-3xl font-bold">×</button>
      </div>

      <hr className="border-light-gray" />

      {/* Rate */}
      <div className="flex flex-col gap-2 border border-light-gray rounded p-[10px]">
        <p className="text-sm font-semibold">Transportation Rate</p>
        <p className="text-[16px] font-bold">{rate}¢ per Kilometer</p>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-4 border border-light-gray rounded p-[10px]">
        {/* Client */}
        <div className="flex flex-col gap-[2px]">
          <p className="text-sm font-normal">Client</p>
          <p className="text-sm font-medium">
            {shift?.clientName ||
              shift?.clientDetails?.name ||
              shift?.clientDetails?.clientName ||
              "N/A"}
          </p>
        </div>

        {/* Starting Point */}
        <div className="flex flex-col gap-[2px]">
          <p className="text-sm font-normal text-[#44474B]">Starting Point</p>
          <p className={addressClass} title={pickupAddress}>
            {pickupAddress}
          </p>
        </div>

        <hr className="border-light-gray" />

        {/* Visit Destination */}
        <div className="flex flex-col gap-[2px]">
          <p className="text-sm font-normal text-[#44474B]">Visit Destination</p>
          <p className={addressClass} title={visitAddress}>
            {visitAddress}
          </p>
          {visitDuration && visitDuration !== "N/A" && (
            <p className="text-xs font-normal text-gray-600">
              Visit Duration: <span className="font-semibold">{visitDuration}</span>
            </p>
          )}
        </div>

        <hr className="border-light-gray" />

        {/* Ending Point */}
        <div className="flex flex-col gap-[2px]">
          <p className="text-sm font-normal text-[#44474B]">Ending Point</p>
          <p className={addressClass} title={dropAddress}>
            {dropAddress}
          </p>
        </div>
      </div>

      {/* Receipts */}
      <div className="flex flex-col gap-2 border border-light-gray rounded p-[10px]">
        <p className="text-sm font-normal">View Receipt</p>
        {receipts.length > 0 ? (
          receipts.map((img, i) => (
            <a
              key={i}
              href={img}
              target="_blank"
              rel="noreferrer"
              className="text-light-green underline"
            >
              Receipt_{i + 1}.png
            </a>
          ))
        ) : (
          <p className="text-sm text-gray-400">No receipts uploaded</p>
        )}
      </div>

      {/* Cost Calculation */}
      <div className="flex flex-col gap-2 border border-light-gray rounded p-[10px]">
        <div className="flex justify-between">
          <p className="text-sm font-normal text-[#44474B]">Distance:</p>
          <p className="text-sm font-bold">{kms} Km</p>
        </div>

        <div className="flex justify-between">
          <p className="text-sm font-normal text-[#44474B]">Rate per Km:</p>
          <p className="text-sm font-bold">${rate}</p>
        </div>

        <hr className="border-light-gray" />

        <div className="flex justify-between">
          <p className="text-sm font-normal text-[#44474B]">Total Cost:</p>
          <p className="text-sm font-bold text-light-green">${totalCost}</p>
        </div>
      </div>
    </div>
  );
};

export default TransportationDetails;
