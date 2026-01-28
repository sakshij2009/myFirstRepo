import React, { useState, useEffect, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { storage, db } from "../firebase";
import { FaUpload } from "react-icons/fa";

const AddTransportation = ({ shiftId, shiftData }) => {
  const [uploadedReceipts, setUploadedReceipts] = useState([]);
  const [travelComments, setTravelComments] = useState("");

  const [pickupAddress, setPickupAddress] = useState("");
  const [visitPoint, setVisitPoint] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [pickupScheduledAt, setPickupScheduledAt] = useState("");
  const [pickupDoneAt, setPickupDoneAt] = useState("");
  const [visitScheduledAt, setVisitScheduledAt] = useState("");
  const [visitDoneAt, setVisitDoneAt] = useState("");
  const [dropScheduledAt, setDropScheduledAt] = useState("");
  const [dropDoneAt, setDropDoneAt] = useState("");

  const [isDriving, setIsDriving] = useState(false);
const [watchId, setWatchId] = useState(null);
const [prevCoords, setPrevCoords] = useState(null);
const [liveDistance, setLiveDistance] = useState(0);
const [startPoint, setStartPoint] = useState("");
const [endPoint, setEndPoint] = useState("");
  // ✅ KM FIELDS (ADDED BACK)
  const [totalKilometer, setTotalKilometer] = useState("");
  const [staffKilometer, setStaffKilometer] = useState("");

  // ✅ APPROVAL FIELDS
const [approvedKm, setApprovedKm] = useState("");
const [approvedBy, setApprovedBy] = useState("");


  // ✅ STOPS
  const [stops, setStops] = useState([{ location: "" }]);

  const fileInputRef = useRef(null);

  const isTransportation =
    shiftData?.categoryName?.toLowerCase() === "transportation" ||
    shiftData?.shiftCategory?.toLowerCase() === "transportation";

  const renderDate = (value) => {
    if (!value) return "—";
    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    if (typeof value === "string") return value;
    return "—";
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ▶️ START DRIVE (NON-TRANSPORTATION)
const handleStartDrive = () => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported in this browser");
    return;
  }

  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    setPrevCoords({ lat: latitude, lng: longitude });
    setLiveDistance(0);
    setIsDriving(true);

    // Reverse geocode start location
    if (window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: latitude, lng: longitude } },
        (res, status) => {
          if (status === "OK" && res[0]) {
            setStartPoint(res[0].formatted_address);
          }
        }
      );
    }

    const id = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lng } = p.coords;

      if (prevCoords) {
        const d = calculateDistance(prevCoords.lat, prevCoords.lng, lat, lng);
        setLiveDistance((prev) => prev + d);
      }

      setPrevCoords({ lat, lng });
    });

    setWatchId(id);
  });
};

// ⏹ END DRIVE (NON-TRANSPORTATION)
const handleEndDrive = () => {
  if (watchId) navigator.geolocation.clearWatch(watchId);

  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    setIsDriving(false);

    // Reverse geocode end location
    if (window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: latitude, lng: longitude } },
        (res, status) => {
          if (status === "OK" && res[0]) {
            setEndPoint(res[0].formatted_address);
            setStaffKilometer(liveDistance.toFixed(2));
            setTotalKilometer(liveDistance.toFixed(2));
          }
        }
      );
    }
  });
};


  // ===================== PREFILL PLANNED TRANSPORT =====================
  useEffect(() => {
    if (
      isTransportation &&
      Array.isArray(shiftData?.shiftPoints) &&
      shiftData.shiftPoints.length > 0
    ) {
      const t = shiftData.shiftPoints[0];

      setPickupAddress(t?.pickupLocation || "");
      setVisitPoint(t?.visitLocation || "");
      setDropAddress(t?.dropLocation || "");

      setPickupScheduledAt(t?.pickupTime || "");
      setPickupDoneAt(t?.pickupDoneAt || "");
      setVisitScheduledAt(t?.visitScheduledAt || "");
      setVisitDoneAt(t?.visitDoneAt || "");
      setDropScheduledAt(t?.dropTime || "");
      setDropDoneAt(t?.dropDoneAt || "");
    }
  }, [shiftData, isTransportation]);

  useEffect(() => {
  if (
    Array.isArray(shiftData?.extraShiftPoints) &&
    shiftData.extraShiftPoints.length > 0
  ) {
    const lastDrive =
      shiftData.extraShiftPoints[shiftData.extraShiftPoints.length - 1];

    setTotalKilometer(lastDrive.totalKilometer || "");
    setStaffKilometer(lastDrive.staffTraveledKM || "");

    // ✅ NEW
    setApprovedKm(lastDrive.approvedKM || "");
    setApprovedBy(lastDrive.approvedBy || "");
  } else {
    setTotalKilometer("");
    setStaffKilometer("");
    setApprovedKm("");
    setApprovedBy("");
  }
}, [shiftData?.extraShiftPoints]);


  useEffect(() => {
    setTravelComments(shiftData?.travelComments || "");
  }, [shiftData?.travelComments]);

  useEffect(() => {
    if (Array.isArray(shiftData?.expenseReceiptUrls)) {
      setUploadedReceipts(
        shiftData.expenseReceiptUrls.map((r) => ({
          name: r.name,
          preview: r.url,
          url: r.url,
        }))
      );
    }
  }, [shiftData?.expenseReceiptUrls]);

  // ===================== STOPS HANDLERS =====================
  const handleStopChange = (index, value) => {
    const updated = [...stops];
    updated[index].location = value;
    setStops(updated);
  };

  const addStop = () => {
    setStops((prev) => [...prev, { location: "" }]);
  };

  const removeStop = (index) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  // ===================== GOOGLE AUTOCOMPLETE =====================
  useEffect(() => {
    if (!window.google || !isTransportation) return;

    stops.forEach((_, index) => {
      const input = document.getElementById(`stop-${index}`);
      if (!input) return;

      const autocomplete = new window.google.maps.places.Autocomplete(input);
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place?.formatted_address) {
          handleStopChange(index, place.formatted_address);
        }
      });
    });
  }, [stops, isTransportation]);

  // ===================== RECEIPT UPLOAD =====================
  const handleReceiptUpload = (e) => {
    const files = Array.from(e.target.files);
    const mapped = files.map((file) => ({
      name: file.name,
      preview: URL.createObjectURL(file),
      file,
    }));
    setUploadedReceipts((prev) => [...prev, ...mapped]);
  };

  const uploadReceiptsToStorage = async () => {
    const urls = [];
    for (const item of uploadedReceipts) {
      if (!item.file) continue;

      const storageRef = ref(
        storage,
        `shiftReceipts/${shiftId}/${Date.now()}_${item.name}`
      );

      await uploadBytes(storageRef, item.file);
      const url = await getDownloadURL(storageRef);

      urls.push({
        name: item.name,
        url,
        uploadedAt: new Date(),
      });
    }
    return urls;
  };

  // ===================== SUBMIT =====================
  // ===================== SUBMIT =====================
const handleSubmit = async () => {
  try {
    const shiftRef = doc(db, "shifts", String(shiftId));
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      alert("Shift not found!");
      return;
    }

    const receiptUrls = await uploadReceiptsToStorage();
    const updatePayload = {};

    // ✅ TRANSPORTATION
    if (isTransportation) {
      updatePayload.extraShiftPoints = arrayUnion({
        stops,
        totalKilometer: Number(totalKilometer) || 0,
        staffTraveledKM: Number(staffKilometer) || 0,

        // 🆕 NEW FIELDS
        approvedKM: approvedKm ? Number(approvedKm) : null,
        approvedBy: approvedBy || null,

        createdAt: new Date(),
      });
    }

    // ✅ NON-TRANSPORTATION
    if (!isTransportation && startPoint && endPoint) {
      updatePayload.extraShiftPoints = arrayUnion({
        startLocation: startPoint,
        endLocation: endPoint,
        totalKilometer: Number(totalKilometer) || 0,
        staffTraveledKM: Number(staffKilometer) || 0,

        // 🆕 NEW FIELDS
        approvedKM: approvedKm ? Number(approvedKm) : null,
        approvedBy: approvedBy || null,

        createdAt: new Date(),
      });
    }

    // ✅ COMMENTS
    if (travelComments) {
      updatePayload.travelComments = travelComments;
    }

    // ✅ RECEIPTS
    if (receiptUrls.length > 0) {
      updatePayload.expenseReceiptUrls = arrayUnion(...receiptUrls);
    }

    if (Object.keys(updatePayload).length > 0) {
      await updateDoc(shiftRef, updatePayload);
    }

    alert("Details saved successfully!");
  } catch (error) {
    console.error("Error saving transportation data:", error);
    alert("Error saving details!");
  }
};


  return (
    <div className="flex flex-col bg-white rounded py-3 px-4 gap-4 text-light-black">
      <h2 className="font-bold text-[28px]">Transportation</h2>

      {/* Header */}
      <div className="flex flex-wrap items-center text-sm gap-6">
        <div><b>Date:</b> {renderDate(shiftData.startDate)}</div>
        <div><b>Staff Name:</b> {shiftData.name || shiftData.userName}</div>
        <div><b>Staff ID:</b> {shiftData.userId}</div>
        <div><b>Client Name:</b> {shiftData.clientName}</div>
        <div><b>Shift Time:</b> {shiftData.startTime} - {shiftData.endTime}</div>
      </div>

      <hr className="border-light-gray" />

      {/* ================= TRANSPORTATION ================= */}
      {isTransportation && (
        <div className="flex flex-col gap-6 mb-6">

          {/* Planned Transport Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-semibold mb-1">Pickup Address</label>
              <input value={pickupAddress} readOnly className="w-full border border-gray rounded p-2 bg-gray-100" />
              <p className="text-sm mt-1 font-bold">Scheduled At: {pickupScheduledAt || "N/A"}</p>
              <p className="text-sm font-bold">Done At: {pickupDoneAt || "Pending"}</p>
            </div>

            {visitPoint && (
              <div>
                <label className="font-semibold mb-1">Visit Address</label>
                <input value={visitPoint} readOnly className="w-full border border-gray rounded p-2 bg-gray-100" />
                <p className="text-sm mt-1 font-bold">Scheduled At: {visitScheduledAt || "N/A"}</p>
                <p className="text-sm font-bold">Done At: {visitDoneAt || "Pending"}</p>
              </div>
            )}

            <div>
              <label className="font-semibold mb-1">Drop Address</label>
              <input value={dropAddress} readOnly className="w-full border border-gray rounded p-2 bg-gray-100" />
              <p className="text-sm mt-1 font-bold">Scheduled At: {dropScheduledAt || "N/A"}</p>
              <p className="text-sm font-bold">Done At: {dropDoneAt || "Pending"}</p>
            </div>
          </div>

          <hr className="border-light-gray" />

          {/* ================= STOPS ================= */}
          <div className="flex flex-col gap-3">
            <label className="font-semibold text-lg">Stops</label>

            {stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder={`Stop ${index + 1} Address`}
                  value={stop.location}
                  onChange={(e) => handleStopChange(index, e.target.value)}
                  className="w-full border border-gray p-2 rounded"
                  id={`stop-${index}`}
                />

                {stops.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStop(index)}
                    className="text-red-600 font-bold text-xl"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addStop}
              className="border px-4 py-2 rounded w-fit text-dark-green border-gray"
            >
              + Add Stop
            </button>
          </div>

          {/* ================= KM FIELDS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="font-semibold mb-1">Total Kilometer (Planned)</label>
              <input
                type="number"
                value={totalKilometer}
                onChange={(e) => setTotalKilometer(e.target.value)}
                placeholder="Enter total planned km"
                className="w-full border border-gray p-2 rounded"
              />
            </div>

            <div>
              <label className="font-semibold mb-1">
                Total Kilometers Staff Traveled
              </label>
              <input
                type="number"
                value={staffKilometer}
                onChange={(e) => setStaffKilometer(e.target.value)}
                placeholder="Enter actual driven km"
                className="w-full border border-gray p-2 rounded"
              />
            </div>
            {/* ================= APPROVAL FIELDS ================= */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
  <div>
    <label className="font-semibold mb-1">Approved Kilometers</label>
    <input
      type="number"
      value={approvedKm}
      onChange={(e) => setApprovedKm(e.target.value)}
      placeholder="Enter approved km"
      className="w-full border border-gray p-2 rounded"
    />
  </div>

  <div>
    <label className="font-semibold mb-1">Approved By</label>
    <input
      type="text"
      value={approvedBy}
      onChange={(e) => setApprovedBy(e.target.value)}
      placeholder="Enter approver name"
      className="w-full border border-gray p-2 rounded"
    />
  </div>
</div>

          </div>
        </div>
      )}

      {/* ================= NON-TRANSPORTATION ================= */}
{/* ================= NON-TRANSPORTATION ================= */}
{!isTransportation && (
  <div className="flex flex-col gap-6 mb-6">

    {/* START / END DRIVE */}
    <div className="flex gap-3 items-center">
      {!isDriving ? (
        <button
          onClick={handleStartDrive}
          className="bg-dark-green text-white px-4 py-2 rounded"
        >
          ▶ Start Drive
        </button>
      ) : (
        <button
          onClick={handleEndDrive}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ⏹ End Drive
        </button>
      )}

      {isDriving && (
        <p className="text-sm font-semibold text-dark-green">
          🚘 Live Distance: {liveDistance.toFixed(2)} km
        </p>
      )}
    </div>

    <div>
      <label className="font-semibold mb-1">Starting Point</label>
      <input
        value={startPoint}
        readOnly
        className="w-full border border-gray rounded p-2 bg-gray-100"
      />
    </div>

    <div>
      <label className="font-semibold mb-1">Ending Point</label>
      <input
        value={endPoint}
        readOnly
        className="w-full border border-gray rounded p-2 bg-gray-100"
      />
    </div>

    <div>
      <label className="font-semibold mb-1">Total Kilometer</label>
      <input
        value={totalKilometer}
        readOnly
        className="w-full border border-gray rounded p-2 bg-gray-100"
      />
    </div>

    <div>
      <label className="font-semibold mb-1">Kilometers Traveled by Staff</label>
      <input
        value={staffKilometer}
        readOnly
        className="w-full border border-gray rounded p-2 bg-gray-100"
      />
    </div>
    {/* ================= APPROVAL FIELDS ================= */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
  <div>
    <label className="font-semibold mb-1">Approved Kilometers</label>
    <input
      type="number"
      value={approvedKm}
      onChange={(e) => setApprovedKm(e.target.value)}
      placeholder="Enter approved km"
      className="w-full border border-gray p-2 rounded"
    />
  </div>

  <div>
    <label className="font-semibold mb-1">Approved By</label>
    <input
      type="text"
      value={approvedBy}
      onChange={(e) => setApprovedBy(e.target.value)}
      placeholder="Enter approver name"
      className="w-full border border-gray p-2 rounded"
    />
  </div>
</div>


  </div>
)}



      <hr className="border-light-gray" />

      {/* ================= RECEIPTS ================= */}
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Upload Receipts</label>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleReceiptUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = null;
              fileInputRef.current.click();
            }
          }}
          className="flex items-center gap-2 border px-3 py-2 rounded text-dark-green border-gray w-fit cursor-pointer"
        >
          <FaUpload /> Upload Receipts
        </button>

        {uploadedReceipts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {uploadedReceipts.map((item, index) => (
              <li
                key={index}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <span
                  className="text-dark-green underline cursor-pointer truncate max-w-[300px]"
                  onClick={() => window.open(item.preview, "_blank")}
                  title={item.name}
                >
                  {item.name}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(item.preview);
                    setUploadedReceipts((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                  className="text-red-600 font-bold text-lg"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ================= COMMENTS ================= */}
      <div>
        <label className="font-semibold mb-1">Travel Comments</label>
        <textarea
          value={travelComments}
          onChange={(e) => setTravelComments(e.target.value)}
          placeholder="Add notes or comments"
          className="w-full border border-gray rounded p-2 h-[100px]"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="bg-dark-green text-white px-6 py-2 rounded cursor-pointer"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default AddTransportation;
