import React, { useState, useEffect, useRef } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { storage, db } from "../firebase";
import { FaUpload, FaPlay, FaStop } from "react-icons/fa";

const AddTransportation = ({ shiftId, shiftData }) => {
  const [stops, setStops] = useState([""]);
  const [startPoint, setStartPoint] = useState("");
  const [visitPoint, setVisitPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [totalKilometer, setTotalKilometer] = useState("");
  const [staffKilometer, setStaffKilometer] = useState("");
  const [uploadedReceipts, setUploadedReceipts] = useState([]);
  const [travelComments, setTravelComments] = useState("");

  const [pickupAddress, setPickupAddress] = useState("");
const [dropAddress, setDropAddress] = useState("");
  const [pickupScheduledAt, setPickupScheduledAt] = useState("");
  const [pickupDoneAt, setPickupDoneAt] = useState("");
  const [visitScheduledAt, setVisitScheduledAt] = useState("");
  const [visitDoneAt, setVisitDoneAt] = useState("");
  const [dropScheduledAt, setDropScheduledAt] = useState("");
  const [dropDoneAt, setDropDoneAt] = useState("");

  const [tracking, setTracking] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const [previousCoords, setPreviousCoords] = useState(null);
  const [travelledDistance, setTravelledDistance] = useState(0);

  const fileInputRef = useRef(null);
  const isTransportation =
    shiftData?.categoryName?.toLowerCase() === "transportation" || shiftData?.shiftCategory?.toLowerCase() === "transportation";


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


  // Prefill ONLY planned transportation data
useEffect(() => {
  if (
    isTransportation &&
    Array.isArray(shiftData?.shiftPoints) &&
    shiftData.shiftPoints.length > 0
  ) {
    const t = shiftData.shiftPoints[0];

    // ✅ Planned timings ONLY
     setPickupAddress(t?.pickupLocation || "");
    setVisitPoint(t?.visitLocation || "");
    setDropAddress(t?.dropLocation || "");

    setPickupScheduledAt(t?.pickupTime || "");
    setPickupDoneAt(t?.pickupDoneAt || "");
    setVisitScheduledAt(t?.visitScheduledAt || "");
    setVisitDoneAt(t?.visitDoneAt || "");
    setDropScheduledAt(t?.dropTime || "");
    setDropDoneAt(t?.dropDoneAt || "");

    // ❌ DO NOT set:
    // totalKilometer
    // staffKilometer
    // startPoint
    // endPoint
  }
}, [shiftData, isTransportation]);

useEffect(() => {
  if (
    Array.isArray(shiftData?.extraShiftPoints) &&
    shiftData.extraShiftPoints.length > 0
  ) {
    const lastDrive =
      shiftData.extraShiftPoints[shiftData.extraShiftPoints.length - 1];

    setStartPoint(lastDrive.startLocation || "");
    setEndPoint(lastDrive.endLocation || "");
    setTotalKilometer(lastDrive.totalKilometer || "");
    setStaffKilometer(lastDrive.staffTraveledKM || "");
  } else {
    // No actual drive yet
    setStartPoint("");
    setEndPoint("");
    setTotalKilometer("");
    setStaffKilometer("");
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
        preview: r.url,   // for opening
        url: r.url,       // stored URL
      }))
    );
  }
}, [shiftData?.expenseReceiptUrls]);

  // Haversine formula for non-transportation live tracking
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Live tracking logic (non-transportation)
  const handleStartDrive = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (res, status) => {
        if (status === "OK" && res[0]) {
          setStartPoint(res[0].formatted_address);
          setPreviousCoords({ lat: latitude, lng: longitude });
          setTravelledDistance(0);

          const id = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude: lat, longitude: lng } = position.coords;
              if (previousCoords) {
                const dist = calculateDistance(previousCoords.lat, previousCoords.lng, lat, lng);
                setTravelledDistance((prev) => prev + dist);
              }
              setPreviousCoords({ lat, lng });
            },
            (err) => console.error("Tracking error:", err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
          );

          setTrackingId(id);
          setTracking(true);
        }
      });
    });
  };

  const handleEndDrive = () => {
    if (trackingId) navigator.geolocation.clearWatch(trackingId);

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (res, status) => {
        if (status === "OK" && res[0]) {
          setEndPoint(res[0].formatted_address);
          setStaffKilometer(travelledDistance.toFixed(2));

          const service = new window.google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            { origins: [startPoint], destinations: [res[0].formatted_address], travelMode: "DRIVING" },
            (response, status) => {
              if (status === "OK") {
                const km = response.rows[0].elements[0].distance.value / 1000;
                setTotalKilometer(km.toFixed(2));
              }
            }
          );
          setTracking(false);
        }
      });
    });
  };

  // Upload receipts
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



// ✅ Updated Submit handler
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

    // ✅ 1. Save extra drive ONLY if drive actually happened
    if (startPoint && endPoint) {
      const extraDrive = {
        startLocation: startPoint,
        endLocation: endPoint,
        totalKilometer: Number(totalKilometer) || 0,
        staffTraveledKM: Number(staffKilometer) || 0,
        createdAt: new Date(),
      };

      updatePayload.extraShiftPoints = arrayUnion(extraDrive);
    }

    // ✅ 2. Save common travel comments (overwrite)
    if (travelComments) {
      updatePayload.travelComments = travelComments;
    }

    // ✅ 3. Save receipts at SHIFT LEVEL
    if (receiptUrls.length > 0) {
      updatePayload.expenseReceiptUrls = arrayUnion(...receiptUrls);
    }

    // 🚀 Final update
    if (Object.keys(updatePayload).length > 0) {
      await updateDoc(shiftRef, updatePayload);
    }

    alert("Transportation details saved successfully!");
  } catch (error) {
    console.error("Error saving transportation data:", error);
    alert("Error saving transportation details!");
  }
};


  return (
    <div className="flex flex-col bg-white rounded py-3 px-4 gap-4 text-light-black">
      <h2 className="font-bold text-[28px]">Transportation</h2>

      {/* Header with full details */}
      <div className="flex flex-wrap items-center text-sm gap-6">
        <div><b>Date:</b> {renderDate(shiftData.startDate)}</div>
        <div><b>Staff Name:</b> {shiftData.name || shiftData.userName}</div>
        <div><b>Staff ID:</b> {shiftData.userId}</div>
        <div><b>Client Name:</b> {shiftData.clientName}</div>
        <div><b>Shift Time:</b> {shiftData.startTime} - {shiftData.endTime}</div>
      </div>

      <hr className="border-light-gray" />

      {/* TRANSPORTATION SHIFT */}
      {isTransportation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="font-semibold mb-1">Pickup Address</label>
            <input value={pickupAddress} readOnly className="w-full border border-gray rounded p-2 bg-gray-100" />
            <p className="text-sm mt-1 font-bold">Scheduled At: {pickupScheduledAt || "N/A"}</p>
            <p className="text-sm  font-bold">Done At: {pickupDoneAt || "Pending"}</p>
          </div>

          {visitPoint && (
            <div>
              <label className="font-semibold mb-1">Visit Address</label>
              <input value={visitPoint} readOnly className="w-full border border-gray rounded p-2 bg-gray-100" />
              <p className="text-sm mt-1 font-bold">Scheduled At: {visitScheduledAt || "N/A"}</p>
              <p className="text-sm  font-bold">Done At: {visitDoneAt || "Pending"}</p>
            </div>
          )}

          <div>
            <label className="font-semibold mb-1">Drop Address</label>
            <input value={dropAddress} readOnly className="w-full border border-gray rounded p-2 bg-gray-100" />
            <p className="text-sm mt-1  font-bold">Scheduled At: {dropScheduledAt || "N/A"}</p>
            <p className="text-sm  font-bold">Done At: {dropDoneAt || "Pending"}</p>
          </div>

          <div>
            <label className="font-semibold mb-1">Total Kilometer (Planned)</label>
            <input value={totalKilometer}  className="w-full border border-gray rounded p-2 bg-gray-100" />
            <label className="font-semibold mt-3 mb-1 block">Total Kilometers Staff Traveled</label>
            <input value={staffKilometer}  className="w-full border border-gray rounded p-2 bg-gray-100" />
          </div>
        </div>
      ) }
        
          {/* NON-TRANSPORTATION SHIFT */}
          <div className="flex gap-3 items-center mb-4">
            {!tracking ? (
              <button onClick={handleStartDrive} className="flex  items-center gap-2 bg-dark-green text-white px-4 py-2 rounded ">
                <FaPlay /> Start Drive
              </button>
            ) : (
              <button onClick={handleEndDrive} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded">
                <FaStop /> End Drive
              </button>
            )}
            {tracking && (
              <p className="text-sm text-dark-green font-semibold">
                🚘 Live Distance: {travelledDistance.toFixed(2)} km
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="font-semibold mb-1">Start Point</label>
              <input value={startPoint} readOnly className="w-full border  border-gray p-2 rounded bg-gray-100" />
            </div>
            <div>
              <label className="font-semibold mb-1">End Point</label>
              <input value={endPoint} readOnly className="w-full border border-gray p-2 rounded bg-gray-100" />
            </div>
            <div>
              <label className="font-semibold mb-1">Total Kilometer (Pickup → Drop)</label>
              <input value={totalKilometer} readOnly className="w-full border border-gray p-2 rounded bg-gray-100" />
            </div>
            <div className="grid">
            <label className="font-semibold mb-1">Total Kilometers Staff Traveled</label>
            <input value={staffKilometer} readOnly className="w-full border rounded border-gray p-2 bg-gray-100" />
          </div>
          </div>

          
        
      

      <hr className="border-light-gray" />

    {/* Receipts + Comments */}
<div className="flex flex-col gap-2">
  <label className="font-semibold">Upload Receipts</label>

  {/* Hidden input */}
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
      fileInputRef.current.value = null; // 🔥 RESET
      fileInputRef.current.click();
    }
  }}
  className="flex items-center gap-2 border px-3 py-2 rounded text-dark-green border-gray w-fit cursor-pointer"
>
  <FaUpload /> Upload Receipts
</button>


  {/* File names list */}
  {uploadedReceipts.length > 0 && (
    <ul className="mt-3 space-y-2">
      {uploadedReceipts.map((item, index) => (
        <li
          key={index}
          className="flex items-center justify-between border rounded px-3 py-2"
        >
          {/* File name */}
          <span
            className="text-dark-green underline cursor-pointer truncate max-w-[300px]"
            onClick={() => window.open(item.preview, "_blank")}
            title={item.name}
          >
            {item.name}
          </span>

          {/* ❌ Remove */}
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
        <button onClick={handleSubmit} className="bg-dark-green text-white px-6 py-2 rounded cursor-pointer">
          Submit
        </button>
      </div>
    </div>
  );
};

export default AddTransportation;
