// import React, { useEffect, useState } from "react";
// import { Formik, Form, Field, ErrorMessage } from "formik";
// import * as Yup from "yup";
// import {
//   getDocs,
//   collection,
//   addDoc,
//   doc,
//   getDoc,
//   updateDoc,
//   query,
//   where,
//   Timestamp,
//   setDoc,
//   deleteDoc,
// } from "firebase/firestore";
// import { db } from "../firebase";
// import { FaChevronDown } from "react-icons/fa";
// import SuccessSlider from "../components/SuccessSlider";
// import { useParams } from "react-router-dom";
// import { sendNotification } from "../utils/notificationHelper";
// import { FaRegMap } from "react-icons/fa";
// import { FaRegCalendarAlt } from "react-icons/fa";
// import { useNavigate } from "react-router-dom";



// // multi-date calendar
// import { DayPicker } from "react-day-picker";
// import "react-day-picker/dist/style.css";

// // ---------------- OFFICE ADDRESS ----------------
// const OFFICE_ADDRESS = "206,10110 124 St, Edmonton T5N 1P6, Alberta, Canada";

// // ---------------- GOOGLE MAPS DISTANCE CALCULATOR ----------------
// const calculateTotalDistance = async (shiftPoint) => {
//   if (!window.google || !window.google.maps) {
//     console.error("Google Maps API not loaded yet.");
//     return 0;
//   }

//   const service = new window.google.maps.DistanceMatrixService();

//   // Build the route sequence dynamically
//   const locations = [OFFICE_ADDRESS, shiftPoint.pickupLocation];
//   if (shiftPoint.visitLocation) locations.push(shiftPoint.visitLocation);
//   locations.push(shiftPoint.dropLocation, OFFICE_ADDRESS);

//   // Helper to calculate distance between two points
//   const getDistance = (origin, destination) =>
//     new Promise((resolve, reject) => {
//       service.getDistanceMatrix(
//         {
//           origins: [origin],
//           destinations: [destination],
//           travelMode: window.google.maps.TravelMode.DRIVING,
//           unitSystem: window.google.maps.UnitSystem.METRIC,
//         },
//         (response, status) => {
//           if (status === "OK" && response.rows[0].elements[0].status === "OK") {
//             const meters = response.rows[0].elements[0].distance.value;
//             resolve(meters);
//           } else {
//             console.error("DistanceMatrix failed:", status, response);
//             resolve(0);
//           }
//         }
//       );
//     });

//   let totalMeters = 0;

//   // Loop through consecutive route segments
//   for (let i = 0; i < locations.length - 1; i++) {
//     const origin = locations[i];
//     const destination = locations[i + 1];
//     if (!origin || !destination) continue;

//     const segmentDistance = await getDistance(origin, destination);
//     totalMeters += segmentDistance;
//   }

//   const totalKilometers = totalMeters / 1000;
//   return totalKilometers.toFixed(2);
// };


// const AddUserShift = ({ mode = "add", user }) => {
//   const { id } = useParams();

//   const [shiftTypes, setShiftTypes] = useState([]);
//   const [shiftCategories, setShiftCategories] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [users, setUsers] = useState([]);

//   const [initialValues, setInitialValues] = useState({
//     shiftType: "",
//     shiftCategory: "",
//     client: "",
//     user: "",
//     startDate: "",
//     endDate: "",
//     startTime: "",
//     endTime: "",
//     description: "",
//     accessToShiftReport: false,
//     shiftDates: [],
//   });

//   const [selectedClient, setSelectedClient] = useState(null);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [selectedShiftType, setSelectedShiftType] = useState(null);
//   const [selectedShiftCategory, setSelectedShiftCategory] = useState(null);
//   const [showCalendar, setShowCalendar] = useState(false);   

//   const navigate = useNavigate();



//   const [slider, setSlider] = useState({
//     show: false,
//     title: "",
//     subtitle: "",
//     redirectTo:"",
//   });
//   const [createdShift, setCreatedShift] = useState(null);

//   // NEW: shiftPoints derived from intake (or existing shift)
//   const [shiftPoints, setShiftPoints] = useState([]);

//   // ---------------- VALIDATION SCHEMA ----------------
//   const validationSchema = Yup.object().shape({
//     shiftType: Yup.string().required("Shift type is required"),
//     shiftCategory: Yup.string().required("Shift category is required"),
//     client: Yup.string().required("Client selection is required"),
//     user: Yup.string().required("User selection is required"),
//     shiftDates: Yup.array()
//       .of(Yup.date().typeError("Invalid date"))
//       .min(1, "At least one shift date is required"),
//     startTime: Yup.string()
//       .required("Start time is required")
//       .matches(
//         /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
//         "Please enter a valid time in HH:MM format"
//       ),
//     endTime: Yup.string()
//       .required("End time is required")
//       .matches(
//         /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
//         "Please enter a valid time in HH:MM format"
//       ),
//     description: Yup.string()
//       .required("Shift description is required")
//       .min(10, "Description should be at least 10 characters"),
//   });

//   // ---------------- FETCH DROPDOWNS ----------------
//   useEffect(() => {
//     const fetchDropdownData = async () => {
//       try {
//         const [shiftTypeSnap, shiftCategorySnap, clientSnap, userSnap] =
//           await Promise.all([
//             getDocs(collection(db, "shiftTypes")),
//             getDocs(collection(db, "shiftCategories")),
//             getDocs(collection(db, "clients")),
//             getDocs(collection(db, "users")),
//           ]);

//         setShiftTypes(
//           shiftTypeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
//         );
//         setShiftCategories(
//           shiftCategorySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
//         );
//         setClients(clientSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
//         setUsers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
//       } catch (error) {
//         console.error("Error fetching dropdown data: ", error);
//       }
//     };
//     fetchDropdownData();
//   }, []);

//   // ---------------- DATE HELPERS ----------------
//   const formatDateFromFirestore = (dateValue) => {
//   if (!dateValue) return "";

//   if (dateValue.toDate) {
//     const d = dateValue.toDate();
//     const year = d.getFullYear();
//     const month = String(d.getMonth() + 1).padStart(2, "0");
//     const day = String(d.getDate()).padStart(2, "0");
//     return `${year}-${month}-${day}`;
//   }

//   if (typeof dateValue === "string") {
//     const parsed = new Date(dateValue);
//     if (!isNaN(parsed)) {
//       const year = parsed.getFullYear();
//       const month = String(parsed.getMonth() + 1).padStart(2, "0");
//       const day = String(parsed.getDate()).padStart(2, "0");
//       return `${year}-${month}-${day}`;
//     }
//   }

//   return "";
// };


//   const normalizeDate = (input) => {
//     if (input instanceof Date) return input;
//     if (input?.toDate) return input.toDate();

//     const direct = new Date(input);
//     if (!isNaN(direct)) return direct;

//     const parts = String(input).split(" ");
//     if (parts.length === 3) {
//       const [day, monthName, year] = parts;
//       const monthIndex = [
//         "January",
//         "February",
//         "March",
//         "April",
//         "May",
//         "June",
//         "July",
//         "August",
//         "September",
//         "October",
//         "November",
//         "December",
//       ].indexOf(monthName);

//       if (monthIndex !== -1) {
//         return new Date(Number(year), monthIndex, Number(day));
//       }
//     }

//     throw new Error("Invalid date format: " + input);
//   };

//   // ---------------- UPDATE MODE: FETCH EXISTING SHIFT ----------------
//  useEffect(() => {
//   const fetchShiftData = async () => {
//     if (mode === "update" && id) {
//       try {
//         const docRef = doc(db, "shifts", id);
//         const docSnap = await getDoc(docRef);

//         if (!docSnap.exists()) return;
//         const data = docSnap.data();

//         // ✅ Normalize field names across old/new schemas
//         const shiftTypeName =
//           data.shiftType ||
//           data.typeName ||
//           data.shiftTypeName ||
//           "";
//         const shiftCategoryName =
//           data.shiftCategory ||
//           data.categoryName ||
//           data.shiftCategoryName ||
//           "";

//         const clientName =
//           data.clientName ||
//           data.clientDetails?.name ||
//           data.clientDetails?.fullName ||
//           "";

//         const userName =
//           data.name ||
//           data.userName ||
//           data.userDetails?.name ||
//           "";

//         // ✅ Match type & category safely (case-insensitive)
//         const shiftTypeObj = shiftTypes.find(
//           (s) =>
//             s.name?.toLowerCase() === shiftTypeName.toLowerCase() ||
//             s.id === shiftTypeName
//         );

//         const shiftCategoryObj = shiftCategories.find(
//           (c) =>
//             c.name?.toLowerCase() === shiftCategoryName.toLowerCase() ||
//             c.id === shiftCategoryName
//         );

//         // ✅ Match client & user safely
//         const clientObj = clients.find(
//           (c) =>
//             c.name?.toLowerCase() === clientName.toLowerCase() ||
//             c.id === data.client ||
//             c.id === data.clientId
//         );

//         const userObj = users.find(
//           (u) =>
//             u.name?.toLowerCase() === userName.toLowerCase() ||
//             u.id === data.user ||
//             u.id === data.userId
//         );

//         // ✅ Normalize dates
//         const startISO = formatDateFromFirestore(data.startDate);
//         const endISO = formatDateFromFirestore(data.endDate);

//         const calendarDates = [];
//         if (startISO) calendarDates.push(new Date(startISO));

//         // ✅ Handle all shift point schema versions (old + new)
//         let points = [];

// if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
//   points = data.shiftPoints.map((p) => ({
//     pickupLocation: p.pickupLocation || "",
//     pickupTime: p.pickupTime || "",
//     pickupLatitude: p.pickupLatitude || 0,
//     pickupLongitude: p.pickupLongitude || 0,

//     visitLocation: p.visitLocation || "",
//     visitStartTime: p.visitStartTime || "",
//     visitEndTime: p.visitEndTime || "",
//     visitLatitude: p.visitLatitude || 0,
//     visitLongitude: p.visitLongitude || 0,

//     dropLocation: p.dropLocation || "",
//     dropTime: p.dropTime || "",
//     dropLatitude: p.dropLatitude || 0,
//     dropLongitude: p.dropLongitude || 0,

//     seatType: p.seatType || "",
//     transportationMode: p.transportationMode || "",

//     // ✅ THIS IS THE KEY FIX
//     totalKilometers:
//       p.totalKilometers !== undefined && p.totalKilometers !== null
//         ? Number(p.totalKilometers)
//         : 0,
//   }));
// } else {
//   points = [
//     {
//       pickupLocation: "",
//       pickupTime: "",
//       visitLocation: "",
//       visitStartTime: "",
//       visitEndTime: "",
//       dropLocation: "",
//       dropTime: "",
//       seatType: "",
//       transportationMode: "",
//       totalKilometers: 0,
//     },
//   ];
// }

// setShiftPoints(points);


//         // ✅ Prefill all fields
//         setInitialValues((prev) => ({
//           ...prev,
//            shiftType: shiftTypeObj ? shiftTypeObj.name : shiftTypeName,
//   shiftCategory: shiftCategoryObj ? shiftCategoryObj.name : shiftCategoryName,
//           client: clientObj ? clientObj.id : "",
//           user: userObj ? userObj.id : "",
//           startDate: startISO,
//           endDate: endISO,
//           startTime: data.startTime || "",
//           endTime: data.endTime || "",
//           description: data.jobdescription || data.description || "",
//           accessToShiftReport: data.accessToShiftReport || false,
//           shiftDates: calendarDates,
//         }));

//         console.log("✅ Prefilled Shift Data:", {
//           shiftTypeName,
//           shiftCategoryName,
//           clientName,
//           userName,
//           shiftPoints: points,
//         });
//       } catch (error) {
//         console.error("Error fetching shift for update:", error);
//       }
//     }
//   };

//   if (
//     shiftTypes.length &&
//     shiftCategories.length &&
//     clients.length &&
//     users.length
//   ) {
//     fetchShiftData();
//   }
// }, [mode, id, shiftTypes, shiftCategories, clients, users]);


//   // ---------------- FETCH SHIFT POINTS FROM INTAKE FOR SELECTED CLIENT ----------------
//   useEffect(() => {
//     const loadShiftPointsFromIntake = async () => {
//       if (!selectedClient) {
//         // if client cleared
//         if (mode !== "update") {
//           setShiftPoints([]);
//         }
//         return;
//       }

//       // If we are editing an existing shift that already has shiftPoints, don't override
//     if (
//   mode === "update" &&
//   Array.isArray(shiftPoints) &&
//   shiftPoints.some(p => p.totalKilometers !== undefined)
// ) {
//   return;
// }


//       try {
//         const clientNameCandidate =
//           (selectedClient.name || selectedClient.fullName || "").trim();

//         if (!clientNameCandidate) return;

//         const snap = await getDocs(collection(db, "InTakeForms"));

//         let foundPoint = null;

//         snap.forEach((d) => {
//           if (foundPoint) return;
//           const data = d.data();

//           // ---------- OLD FORMAT: inTakeClients array ----------
//           if (Array.isArray(data.inTakeClients)) {
//             data.inTakeClients.forEach((cl) => {
//               if (foundPoint) return;
//               const clName = (cl.name || "").trim();
//               if (!clName) return;

//               if (clName === clientNameCandidate) {
//                 foundPoint = {
//                   pickupLocation: cl.pickupAddress || "",
//                   pickupTime: cl.pickupTime || "",
//                   visitLocation: cl.visitAddress || "",
//                   visitStartTime: cl.startVisitTime || "",
//                   visitEndTime: cl.endVisitTime || "",
//                   dropLocation: cl.dropAddress || "",
//                   dropTime: cl.dropTime || "",
//                   seatType: cl.typeOfSeat || "",
//                   transportationMode:
//                     cl.purposeOfTransportation || cl.transportationMode || "",
//                 };
//               }
//             });
//           }

//           // ---------- NEW FORMAT: clients map with transportation sub-object ----------
//           if (!foundPoint && data.clients && typeof data.clients === "object") {
//             Object.values(data.clients).forEach((c) => {
//               if (foundPoint) return;
//               const cName = (c.fullName || c.name || "").trim();
//               if (!cName) return;

//               if (cName === clientNameCandidate) {
//                 const t = c.transportation || {};
//                 foundPoint = {
//                   pickupLocation: t.pickupAddress || "",
//                   pickupTime: t.pickupTime || "",
//                   visitLocation: t.visitAddress || "",
//                   visitStartTime: t.startVisitTime || "",
//                   visitEndTime: t.endVisitTime || "",
//                   dropLocation: t.dropAddress || "",
//                   dropTime: t.dropTime || "",
//                   seatType: t.typeOfSeat || "",
//                   transportationMode: t.transportationMode || "",
//                 };
//               }
//             });
//           }
//         });

//         if (foundPoint) {
//           setShiftPoints([foundPoint]);
//         } else {
//           setShiftPoints([]);
//         }
//       } catch (err) {
//         console.error("Error loading shift points from intake:", err);
//       }
//     };

//     loadShiftPointsFromIntake();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedClient, mode]);

//   // ---------------- SUBMIT HANDLER ----------------
//   // ---------------- SUBMIT HANDLER ----------------
// const handleSubmit = async (values, { resetForm }) => {
//   try {
//     const { shiftDates, ...restValues } = values;
//     const selectedDates = shiftDates || [];

//     if (!selectedDates.length) {
//       alert("Please select at least one shift date.");
//       return;
//     }

//     const fp = shiftPoints[0] || {}; // from intake

//     const finalPoint = {
//       pickupLocation: fp.pickupLocation || "",
//       pickupTime: fp.pickupTime || "",
//       pickupLatitude: fp.pickupLatitude || 0,
//       pickupLongitude: fp.pickupLongitude || 0,

//       visitLocation: fp.visitLocation || "",
//       visitStartTime: fp.visitStartTime || "",
//       visitEndTime: fp.visitEndTime || "",
//       visitLatitude: fp.visitLatitude || 0,
//       visitLongitude: fp.visitLongitude || 0,

//       dropLocation: fp.dropLocation || "",
//       dropTime: fp.dropTime || "",
//       dropLatitude: fp.dropLatitude || 0,
//       dropLongitude: fp.dropLongitude || 0,

//       seatType: fp.seatType || "",
//       transportationMode: fp.transportationMode || "",
//       purposeOfTransportation: fp.purposeOfTransportation || "",
//     };

//     // ---------- UPDATE MODE ----------
//     if (mode === "update" && id) {
//       const shiftsRef = collection(db, "shifts");
//       const qShift = query(shiftsRef, where("id", "==", id));
//       const snap = await getDocs(qShift);

//       if (!snap.empty) {
//         const docRef = snap.docs[0].ref;

//         const primaryDate = normalizeDate(selectedDates[0]);
//         const isOvernight = values.endTime < values.startTime;
//         let endDateObj = new Date(primaryDate);
//         if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

//         // ✅ Ensure totalKilometers lives inside shiftPoints only
// const pointWithKM = {
//   ...finalPoint,
//   totalKilometers: Number(shiftPoints[0]?.totalKilometers) || 0,
// };

// await updateDoc(docRef, {
//   ...restValues,
//   userId: selectedUser?.userId || selectedUser?.id || values.user || "",
//   userName: selectedUser?.name || selectedUser?.fullName || "",
//   startDate: Timestamp.fromDate(primaryDate),
//   endDate: Timestamp.fromDate(endDateObj),
//   clientDetails: selectedClient,
//   updatedAt: new Date(),
//   shiftPoints: [pointWithKM], // ✅ Only inside shiftPoints
//   clockIn: "",
//   clockOut: "",
//   isRatified: false,
//   isCancelled: false,
//   dateKey: primaryDate.toISOString().split("T")[0],
// });


//         setSlider({
//           show: true,
//           title: "Shift Updated Successfully!",
//           subtitle: `${selectedClient?.name || ""} on ${primaryDate.toDateString()} at ${values.startTime}`,
//           redirectTo: "/admin-dashboard/dashboard",
//         });
//       }
//       return;
//     }

//     // ---------- ADD MODE ----------
//     for (const date of selectedDates) {
//       const startDateObj = normalizeDate(date);
//       const newShiftId = Date.now().toString();

//       const isOvernight = values.endTime < values.startTime;
//       let endDateObj = new Date(startDateObj);
//       if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

//      // ✅ Ensure totalKilometers lives inside the shift point itself
// const pointWithKM = {
//   ...finalPoint,
//   totalKilometers: Number(shiftPoints[0]?.totalKilometers) || 0,
// };

// await setDoc(doc(db, "shifts", newShiftId), {
//   ...values,
//    userId:selectedUser?.userId ,
//   userName: selectedUser?.name || "",
//   startDate: startDateObj,
//   endDate: endDateObj,
//   clientDetails: selectedClient,
//   createdAt: new Date(),
//   shiftReport: "",
//   shiftConfirmed: false,
//   id: newShiftId,
//   shiftPoints: [pointWithKM], // ✅ stored here
//   clockIn: "",
//   clockOut: "",
//   isRatify: false,
//   isCancelled: false,
// });


//       // ✅ SEND ADMIN NOTIFICATION
//       const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
//       const adminsSnapshot = await getDocs(adminQuery);
//       for (const admin of adminsSnapshot.docs) {
//         await sendNotification(admin.id, {
//           type: "info",
//           title: "New Shift Created",
//           message: `A new shift has been added for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
//           senderId: user.name,
//           meta: {
//             shiftId: newShiftId,
//             entity: "Shift",
//             date: startDateObj.toDateString(),
//           },
//         });
//       }

//       // ✅ SEND STAFF NOTIFICATION
//       if (values.user) {
//         try {
//           await sendNotification(values.user, {
//             type: "info",
//             title: "New Shift Assigned",
//             message: `You have been assigned a new shift for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
//             senderId: user.name,
//             meta: {
//               shiftId: newShiftId,
//               entity: "Shift",
//               date: startDateObj.toDateString(),
//             },
//           });
//         } catch (err) {
//           console.error("Error sending staff notification:", err);
//         }
//       }
//     }

//     // ✅ SUCCESS SLIDER
//     const firstDate = normalizeDate(selectedDates[0]);
//     setSlider({
//       show: true,
//       title: "Shifts Created Successfully!",
//       subtitle: `${selectedClient?.name || ""} – ${selectedDates.length} day(s) starting ${firstDate.toDateString()} at ${values.startTime}`,
//       redirectTo: "/admin-dashboard/dashboard",
//     });

//     setCreatedShift(values);
//     resetForm();
//     setShiftPoints([]);
//   } catch (error) {
//     console.error("Error saving shift:", error);
//   }
// };


// const handleCalculateKilometers = async (shiftPoint) => {
//   if (!shiftPoint.pickupLocation || !shiftPoint.dropLocation) {
//     alert("Please enter both pickup and drop locations first.");
//     return;
//   }

//   try {
//     const km = await calculateTotalDistance(shiftPoint);
//     setShiftPoints([{ ...shiftPoint, totalKilometers: km }]);
//   } catch (err) {
//     console.error("Error calculating total distance:", err);
//     alert("Failed to calculate total kilometers.");
//   }
// };




//   // ---------------- RENDER ----------------
//   return (
//     <div className="flex flex-col gap-4">
//       <div className="flex justify-between">
//         <p className="font-bold text-2xl leading-7 text-light-black flex">
//         {mode === "update" ? "Update Shift" : "Add Shift"}
//       </p>
//        {mode === "update" && (
//     <button
//       onClick={async () => {
//         if (window.confirm("Are you sure you want to delete this shift?")) {
//           try {
//             await deleteDoc(doc(db, "shifts", id));
//             alert("Shift deleted successfully!");
//             window.history.back(); // navigate back after delete
//           } catch (err) {
//             console.error("Error deleting shift:", err);
//             alert("Failed to delete shift. Please try again.");
//           }
//         }
//       }}
//       className="bg-[#C70036] text-white px-4 py-2 rounded hover:bg-[#A0002C] transition flex"
//     >
//       Delete Shift
//     </button>
//   )}
//       </div>

//       <hr className="border-t border-gray" />

//       <Formik
//         enableReinitialize
//         initialValues={initialValues}
//         validationSchema={validationSchema}
//         onSubmit={handleSubmit}
//       >
//         {({ touched, errors, values, setFieldValue }) => {
//           // sync client/user/type/category objects
//           useEffect(() => {
//             const clientData = clients.find((c) => c.id === values.client);
//             setSelectedClient(clientData || null);

//             const userData = users.find((u) => u.id === values.user);
//             setSelectedUser(userData || null);

//             const shiftTypeData = shiftTypes.find(
//               (s) => s.id === values.shiftType
//             );
//             setSelectedShiftType(shiftTypeData || null);

//            const shiftCategoryData = shiftCategories.find(
//               (s) => s.name === values.shiftCategory
//             );

//             setSelectedShiftCategory(shiftCategoryData || null);
//           }, [
//             values.client,
//             values.user,
//             values.shiftType,
//             values.shiftCategory,
//           ]);

//           const handleDatesChange = (dates) => {
//             const selected = dates || [];
//             setFieldValue("shiftDates", selected);

//             if (selected.length > 0) {
//               const sorted = [...selected].sort((a, b) => a - b);
//               const first = sorted[0];
//               const last = sorted[sorted.length - 1];

//               const toISO = (d) => d.toISOString().split("T")[0];
//               setFieldValue("startDate", toISO(first));
//               setFieldValue("endDate", toISO(last));
//             } else {
//               setFieldValue("startDate", "");
//               setFieldValue("endDate", "");
//             }
//           };

//           const firstPoint = shiftPoints[0] || null;

//           return (
//             <Form className="flex flex-col gap-4">
//               <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4">
//                 {/* Shift Type */}
//                 <div className="relative">
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Shift Type
//                   </label>
//                   <Field
//                     as="select"
//                     name="shiftType"
//                     className={`w-full border rounded-sm p-[10px] appearance-none pr-10
//                       ${
//                         touched.shiftType && errors.shiftType
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }
//                       ${
//                         values.shiftType
//                           ? "text-black"
//                           : "text-[#72787E] text-sm"
//                       }`}
//                   >
//                     <option value="" className="text-[#72787E]">
//                       Please select the shift type
//                     </option>
//                     {shiftTypes.map((item) => (
//                       <option
//                         key={item.id}
//                         value={item.name}
//                         className="text-black"
//                       >
//                         {item.name}
//                       </option>
//                     ))}
//                   </Field>
//                   <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
//                     <FaChevronDown className="text-light-green w-4 h-4" />
//                   </span>
//                   <ErrorMessage
//                     name="shiftType"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

//                 {/* Shift Category */}
//                 <div className="relative">
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Shift Category
//                   </label>
//                   <Field
//                     as="select"
//                     name="shiftCategory"
//                     className={`w-full border rounded-sm p-[10px] appearance-none pr-10
//                       ${
//                         touched.shiftCategory && errors.shiftCategory
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }
//                       ${
//                         values.shiftCategory
//                           ? "text-black"
//                           : "text-[#72787E] text-sm"
//                       }`}
//                   >
//                     <option value="" className="text-gray-400">
//                       Please select the shift category
//                     </option>
//                     {shiftCategories.map((item) => (
//                       <option
//                         key={item.id}
//                         value={item.name}
//                         className="text-black"
//                       >
//                         {item.name}
//                       </option>
//                     ))}
//                   </Field>
//                   <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
//                     <FaChevronDown className="text-light-green w-4 h-4" />
//                   </span>
//                   <ErrorMessage
//                     name="shiftCategory"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

//                 {/* Client */}
//                 <div className="relative">
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Select Client
//                   </label>
//                   <Field
//                     as="select"
//                     name="client"
//                     className={`w-full border rounded-sm p-[10px] appearance-none pr-10
//                       ${
//                         touched.client && errors.client
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }
//                       ${
//                         values.client
//                           ? "text-black"
//                           : "text-[#72787E] text-sm"
//                       }`}
//                   >
//                     <option value="" className="text-gray-400">
//                       Please select a client
//                     </option>
//                     {clients.map((item) => (
//                       <option
//                         key={item.id}
//                         value={item.id}
//                         className="text-black"
//                       >
//                         {item.name}
//                       </option>
//                     ))}
//                   </Field>
//                   <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
//                     <FaChevronDown className="text-light-green w-4 h-4" />
//                   </span>
//                   <ErrorMessage
//                     name="client"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

//                 {/* User */}
//                 <div className="relative">
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Select User
//                   </label>
//                   <Field
//                     as="select"
//                     name="user"
//                     className={`w-full border rounded-sm p-[10px] appearance-none pr-10
//                       ${
//                         touched.user && errors.user
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }
//                       ${
//                         values.user ? "text-black" : "text-[#72787E] text-sm"
//                       }`}
//                   >
//                     <option value="" className="text-gray-400">
//                       Please select a user
//                     </option>
//                     {users.map((item) => (
//                       <option
//                         key={item.id}
//                         value={item.id}
//                         className="text-black"
//                       >
//                         {item.name}
//                       </option>
//                     ))}
//                   </Field>
//                   <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
//                     <FaChevronDown className="text-light-green w-4 h-4" />
//                   </span>
//                   <ErrorMessage
//                     name="user"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

//                 {/* Multi-date calendar */}
//                 {/* Shift Dates */}
// <div className="col-span-2">
//   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//     Shift Dates
//   </label>

//   {/* 🔥 NEW Trigger Box */}
//   <div
//     onClick={() => setShowCalendar(true)}
//     className="mt-2 w-56 border border-light-gray rounded-sm px-3 py-2 flex items-center justify-between cursor-pointer bg-white"
//   >
//     <span className="text-gray-600 text-sm">
//       {values.shiftDates?.length > 0
//         ? `${values.shiftDates.length} date(s) selected`
//         : "Select dates"}
//     </span>

//     <FaRegCalendarAlt className="text-dark-green text-lg" />
//   </div>

//   <ErrorMessage
//     name="shiftDates"
//     component="div"
//     className="text-red-500 text-xs mt-1"
//   />

//   {/* 🔥 POPUP CALENDAR */}
//   {showCalendar && (
//     <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

//       <div className="bg-white p-5 rounded-md shadow-lg min-w-[360px]">
//         <h2 className="text-lg font-bold mb-3 text-light-black">
//           Select Shift Dates
//         </h2>

//         <DayPicker
//           mode="multiple"
//           selected={values.shiftDates}
//           onSelect={(dates) => handleDatesChange(dates)}
//           className="custom-daypicker-green"
//         />

//         <div className="flex justify-end gap-3 mt-4">
//           <button
//             onClick={() => setShowCalendar(false)}
//             className="px-4 py-1 border border-gray-400 rounded"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={() => setShowCalendar(false)}
//             className="px-4 py-1 bg-dark-green text-white rounded"
//           >
//             Done
//           </button>
//         </div>
//       </div>
//     </div>
//   )}
// </div>





//                 {/* Start Time */}
//                 <div>
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Start Time
//                   </label>
//                   <Field
//                     name="startTime"
//                     type="text"
//                     placeholder="HH:MM(24 Hrs Format)"
//                     className={`w-full border rounded-sm p-[10px] placeholder:text-sm
//                       ${
//                         touched.startTime && errors.startTime
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }`}
//                   />
//                   <ErrorMessage
//                     name="startTime"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

//                 {/* End Time */}
//                 <div>
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     End Time
//                   </label>
//                   <Field
//                     name="endTime"
//                     type="text"
//                     placeholder="HH:MM(24 Hrs Format)"
//                     className={`w-full border rounded-sm p-[10px] placeholder:text-sm
//                       ${
//                         touched.endTime && errors.endTime
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }`}
//                   />
//                   <ErrorMessage
//                     name="endTime"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

//                 {/* Access To Shift Report */}
//                 <div className="col-span-2 ">
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Access to Shift Report
//                   </label>

//                   <div className="flex items-center gap-4 mt-2">
//                     <span>No</span>

//                     <Field name="accessToShiftReport">
//                       {({ field, form }) => (
//                         <div
//                           onClick={() =>
//                             form.setFieldValue(
//                               "accessToShiftReport",
//                               !field.value
//                             )
//                           }
//                           className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition 
//                             ${
//                               field.value ? "bg-dark-green" : "bg-gray-400"
//                             }`}
//                         >
//                           <div
//                             className={`bg-white w-5 h-5 rounded-full shadow transform transition 
//                               ${
//                                 field.value
//                                   ? "translate-x-6"
//                                   : "translate-x-0"
//                               }`}
//                           ></div>
//                         </div>
//                       )}
//                     </Field>

//                     <span>Yes</span>
//                   </div>
//                 </div>

//                 {/* Description */}
//                 <div className="col-span-2">
//                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
//                     Description of Shift
//                   </label>
//                   <Field
//                     as="textarea"
//                     name="description"
//                     placeholder="Write the description of the Shift"
//                     className={`w-full border rounded-sm p-[10px] h-50 placeholder:text-sm
//                       ${
//                         touched.description && errors.description
//                           ? "border-red-500"
//                           : "border-light-gray"
//                       }`}
//                   />
//                   <ErrorMessage
//                     name="description"
//                     component="div"
//                     className="text-red-500 text-xs mt-1"
//                   />
//                 </div>

// {/* NEW: SHIFT POINTS (TRANSPORTATION) SECTION */}
// {selectedClient && (
//   <div className="col-span-2">
//     <p className="font-bold text-sm text-light-black ">Shift Point</p>
//      <button
//     type="button"
//     className="text-dark-green text-sm underline cursor-pointer"
//     onClick={() => {
//       if (!firstPoint) return;

//       const swapped = {
//         ...firstPoint,
//         pickupLocation: firstPoint.dropLocation,

//         dropLocation: firstPoint.pickupLocation,

//       };

//       setShiftPoints([swapped]);
//     }}
//   >
//     Swap Pickup / Drop
//   </button>

//     {firstPoint ? (
//       <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm border border-light-gray rounded-sm p-4">

//         {/* ------------------------- PICKUP LOCATION ------------------------- */}
//         <div className="flex flex-col gap-1">
//           <span className="font-semibold text-[#44474B]">Pickup Location</span>

//           <div className="flex items-center gap-2">
//             {!firstPoint.pickupLocation_edit ? (
//               <p
//                 className="font-medium truncate max-w-[220px] cursor-pointer"
//                 onClick={() =>
//                   setShiftPoints([{ ...firstPoint, pickupLocation_edit: true }])
//                 }
//                 title={firstPoint.pickupLocation}
//               >
//                 {firstPoint.pickupLocation || "N/A"}
//               </p>
//             ) : (
//               <input
//                 type="text"
//                 autoFocus
//                 className="border border-light-gray rounded-sm p-[6px] text-sm w-full"
//                 value={firstPoint.pickupLocation || ""}
//                 onChange={async (e) => {
//                   const updatedPickup = e.target.value;
//                   let updatedPoint = { ...firstPoint, pickupLocation: updatedPickup };

//                   if (updatedPickup && firstPoint.dropLocation && window.google) {
//                     const km = await calculateDistance(updatedPickup, firstPoint.dropLocation);
//                     updatedPoint.totalKilometers = km;
//                   }

//                   setShiftPoints([updatedPoint]);
//                 }}


//                 onBlur={() =>
//                   setShiftPoints([{ ...firstPoint, pickupLocation_edit: false }])
//                 }
//               />
//             )}

//             <FaRegMap
//               className="text-dark-green text-lg cursor-pointer hover:opacity-70"
//               onClick={() =>
//                 window.open(
//                   `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
//                     firstPoint.pickupLocation || ""
//                   )}`,
//                   "_blank"
//                 )
//               }
//             />
//           </div>
//         </div>

//         {/* ------------------------- PICKUP TIME ------------------------- */}
//         <div className="flex flex-col gap-1">
//           <span className="font-semibold text-[#44474B]">Pickup Time</span>

//           {!firstPoint.pickupTime_edit ? (
//             <p
//               className="font-medium cursor-pointer"
//               onClick={() =>
//                 setShiftPoints([{ ...firstPoint, pickupTime_edit: true }])
//               }
//             >
//               {firstPoint.pickupTime || "N/A"}
//             </p>
//           ) : (
//             <input
//               type="text"
//               autoFocus
//               className="border border-light-gray rounded-sm p-[6px] text-sm"
//               value={firstPoint.pickupTime || ""}
//               onChange={(e) =>
//                 setShiftPoints([{ ...firstPoint, pickupTime: e.target.value }])
//               }
//               onBlur={() =>
//                 setShiftPoints([{ ...firstPoint, pickupTime_edit: false }])
//               }
//             />
//           )}
//         </div>

//         {/* ------------------------- DROP LOCATION ------------------------- */}
//         <div className="flex flex-col gap-1">
//           <span className="font-semibold text-[#44474B]">Drop Location</span>

//           <div className="flex items-center gap-2">
//             {!firstPoint.dropLocation_edit ? (
//               <p
//                 className="font-medium truncate max-w-[220px] cursor-pointer"
//                 title={firstPoint.dropLocation}
//                 onClick={() =>
//                   setShiftPoints([{ ...firstPoint, dropLocation_edit: true }])
//                 }
//               >
//                 {firstPoint.dropLocation || "N/A"}
//               </p>
//             ) : (
//               <input
//                 type="text"
//                 autoFocus
//                 className="border border-light-gray rounded-sm p-[6px] text-sm w-full"
//                 value={firstPoint.dropLocation || ""}
//                 onChange={async (e) => {
//                   const updatedDrop = e.target.value;
//                   let updatedPoint = { ...firstPoint, dropLocation: updatedDrop };

//                   if (firstPoint.pickupLocation && updatedDrop && window.google) {
//                     const km = await calculateDistance(firstPoint.pickupLocation, updatedDrop);
//                     updatedPoint.totalKilometers = km;
//                   }

//                   setShiftPoints([updatedPoint]);
//                 }}


//                 onBlur={() =>
//                   setShiftPoints([{ ...firstPoint, dropLocation_edit: false }])
//                 }
//               />
//             )}

//             <FaRegMap
//               className="text-dark-green text-lg cursor-pointer hover:opacity-70"
//               onClick={() =>
//                 window.open(
//                   `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
//                     firstPoint.dropLocation || ""
//                   )}`,
//                   "_blank"
//                 )
//               }
//             />
//           </div>
//         </div>

//         {/* ------------------------- DROP TIME ------------------------- */}
//         <div className="flex flex-col gap-1">
//           <span className="font-semibold text-[#44474B]">Drop Time</span>

//           {!firstPoint.dropTime_edit ? (
//             <p
//               className="font-medium cursor-pointer"
//               onClick={() =>
//                 setShiftPoints([{ ...firstPoint, dropTime_edit: true }])
//               }
//             >
//               {firstPoint.dropTime || "N/A"}
//             </p>
//           ) : (
//             <input
//               type="text"
//               autoFocus
//               className="border border-light-gray rounded-sm p-[6px] text-sm"
//               value={firstPoint.dropTime || ""}
//               onChange={(e) =>
//                 setShiftPoints([{ ...firstPoint, dropTime: e.target.value }])
//               }
//               onBlur={() =>
//                 setShiftPoints([{ ...firstPoint, dropTime_edit: false }])
//               }
//             />
//           )}
//         </div>

//         {/* ------------------------- VISIT FIELDS (ONLY IF EXIST) ------------------------- */}
//         {firstPoint.visitLocation?.trim() !== "" && (
//           <>
//             {/* VISIT LOCATION */}
//             <div className="flex flex-col gap-1">
//               <span className="font-semibold text-[#44474B]">
//                 Visit Location
//               </span>

//               <div className="flex items-center gap-2">
//                 {!firstPoint.visitLocation_edit ? (
//                   <p
//                     className="font-medium truncate max-w-[220px] cursor-pointer"
//                     title={firstPoint.visitLocation}
//                     onClick={() =>
//                       setShiftPoints([
//                         { ...firstPoint, visitLocation_edit: true }
//                       ])
//                     }
//                   >
//                     {firstPoint.visitLocation}
//                   </p>
//                 ) : (
//                   <input
//                     type="text"
//                     autoFocus
//                     className="border border-light-gray rounded-sm p-[6px] text-sm w-full"
//                     value={firstPoint.visitLocation || ""}
//                     onChange={(e) =>
//                       setShiftPoints([
//                         { ...firstPoint, visitLocation: e.target.value }
//                       ])
//                     }
//                     onBlur={() =>
//                       setShiftPoints([
//                         { ...firstPoint, visitLocation_edit: false }
//                       ])
//                     }
//                   />
//                 )}

//                 <FaRegMap
//                   className="text-dark-green text-lg cursor-pointer hover:opacity-70"
//                   onClick={() =>
//                     window.open(
//                       `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
//                         firstPoint.visitLocation || ""
//                       )}`,
//                       "_blank"
//                     )
//                   }
//                 />
//               </div>
//             </div>

//             {/* VISIT DURATION (Start – End) */}
//             <div className="flex flex-col gap-1">
//               <span className="font-semibold text-[#44474B]">
//                 Visit Duration
//               </span>

//               <div className="flex items-center gap-2">
//                 {/* START TIME */}
//                 {!firstPoint.visitStartTime_edit ? (
//                   <p
//                     className="font-medium cursor-pointer"
//                     onClick={() =>
//                       setShiftPoints([
//                         { ...firstPoint, visitStartTime_edit: true }
//                       ])
//                     }
//                   >
//                     {firstPoint.visitStartTime || "N/A"}
//                   </p>
//                 ) : (
//                   <input
//                     type="text"
//                     autoFocus
//                     className="border border-light-gray rounded-sm p-[6px] text-sm w-24"
//                     value={firstPoint.visitStartTime || ""}
//                     onChange={(e) =>
//                       setShiftPoints([
//                         { ...firstPoint, visitStartTime: e.target.value }
//                       ])
//                     }
//                     onBlur={() =>
//                       setShiftPoints([
//                         { ...firstPoint, visitStartTime_edit: false }
//                       ])
//                     }
//                   />
//                 )}

//                 <span>–</span>

//                 {/* END TIME */}
//                 {!firstPoint.visitEndTime_edit ? (
//                   <p
//                     className="font-medium cursor-pointer"
//                     onClick={() =>
//                       setShiftPoints([
//                         { ...firstPoint, visitEndTime_edit: true }
//                       ])
//                     }
//                   >
//                     {firstPoint.visitEndTime || "N/A"}
//                   </p>
//                 ) : (
//                   <input
//                     type="text"
//                     autoFocus
//                     className="border border-light-gray rounded-sm p-[6px] text-sm w-24"
//                     value={firstPoint.visitEndTime || ""}
//                     onChange={(e) =>
//                       setShiftPoints([
//                         { ...firstPoint, visitEndTime: e.target.value }
//                       ])
//                     }
//                     onBlur={() =>
//                       setShiftPoints([
//                         { ...firstPoint, visitEndTime_edit: false }
//                       ])
//                     }
//                   />
//                 )}
//               </div>
//             </div>
//           </>
//         )}

//         {/* ------------------------- SEAT TYPE ------------------------- */}
//         <div className="flex flex-col gap-1">
//           <span className="font-semibold text-[#44474B]">Seat Type</span>

//           {!firstPoint.seatType_edit ? (
//             <p
//               className="font-medium cursor-pointer"
//               onClick={() =>
//                 setShiftPoints([{ ...firstPoint, seatType_edit: true }])
//               }
//             >
//               {firstPoint.seatType || "N/A"}
//             </p>
//           ) : (
//             <input
//               type="text"
//               autoFocus
//               className="border border-light-gray rounded-sm p-[6px] text-sm"
//               value={firstPoint.seatType || ""}
//               onChange={(e) =>
//                 setShiftPoints([{ ...firstPoint, seatType: e.target.value }])
//               }
//               onBlur={() =>
//                 setShiftPoints([{ ...firstPoint, seatType_edit: false }])
//               }
//             />
//           )}
//         </div>

//         {/* ------------------------- TRANSPORTATION MODE ------------------------- */}
//         <div className="flex flex-col gap-1">
//           <span className="font-semibold text-[#44474B]">
//             Transportation Mode
//           </span>

//           {!firstPoint.transportationMode_edit ? (
//             <p
//               className="font-medium cursor-pointer"
//               onClick={() =>
//                 setShiftPoints([
//                   { ...firstPoint, transportationMode_edit: true }
//                 ])
//               }
//             >
//               {firstPoint.transportationMode || "N/A"}
//             </p>
//           ) : (
//             <input
//               type="text"
//               autoFocus
//               className="border border-light-gray rounded-sm p-[6px] text-sm"
//               value={firstPoint.transportationMode || ""}
//               onChange={(e) =>
//                 setShiftPoints([
//                   { ...firstPoint, transportationMode: e.target.value }
//                 ])
//               }
//               onBlur={() =>
//                 setShiftPoints([
//                   { ...firstPoint, transportationMode_edit: false }
//                 ])
//               }
//             />
//           )}
//         </div>
// {/* ------------------------- TOTAL KILOMETERS ------------------------- */}
// <div className="flex flex-col gap-2">
//   <span className="font-semibold text-[#44474B]">Total Kilometers</span>

//   <div className="flex items-center gap-3">
//     <input
//       type="text"
//       readOnly
//       className="border border-light-gray rounded-sm p-[6px] text-sm w-32 bg-gray-50"
//       value={firstPoint.totalKilometers || ""}
//       placeholder="Not calculated"
//     />

//     <button
//       type="button"
//       onClick={() => handleCalculateKilometers(firstPoint)}
//       className="bg-dark-green text-white px-3 py-1 rounded text-sm hover:opacity-90"
//     >
//       Calculate Total Kilometers
//     </button>
//   </div>
// </div>


//       </div>
//     ) : (
//       <p className="text-xs text-gray-500">
//         No transportation details found in intake for this client.
//       </p>
//     )}
//   </div>
// )}

//               </div>

//               <div className="col-span-2 flex justify-center">
//                 <button
//                   type="submit"
//                   className="bg-dark-green text-white px-6 py-2 rounded cursor-pointer"
//                 >
//                   {mode === "update" ? "Update Shift" : "Add Shift"}
//                 </button>
//               </div>
//             </Form>
//           );
//         }}
//       </Formik>

//       <SuccessSlider
//         show={slider.show}
//         title={slider.title}
//         subtitle={slider.subtitle}
//         viewText="View Shift"
//         onView={() => {
//             navigate("/admin-dashboard/dashboard", {
//               state: { shiftCategory: selectedShiftCategory?.name }
//             });
//           setSlider({ ...slider, show: false });

//         }}
//         onDismiss={() => setSlider({ ...slider, show: false })}
//       />
//     </div>
//   );
// };

// export default AddUserShift;

import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  getDocs,
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaChevronDown, FaRegMap, FaRegCalendarAlt } from "react-icons/fa";
import SuccessSlider from "../components/SuccessSlider";
import { useParams, useNavigate } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";

// multi-date calendar
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// ---------------- OFFICE ADDRESS ----------------
const OFFICE_ADDRESS = "206,10110 124 St, Edmonton T5N 1P6, Alberta, Canada";

// ---------------- GOOGLE MAPS: DISTANCE BETWEEN TWO ADDRESSES ----------------
const calculateDistance = async (origin, destination) => {
  if (!window.google || !window.google.maps) {
    console.error("Google Maps API not loaded yet.");
    return 0;
  }

  const service = new window.google.maps.DistanceMatrixService();

  return new Promise((resolve) => {
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === "OK" && response.rows?.[0]?.elements?.[0]?.status === "OK") {
          const meters = response.rows[0].elements[0].distance.value;
          resolve((meters / 1000).toFixed(2));
        } else {
          console.error("DistanceMatrix failed:", status, response);
          resolve(0);
        }
      }
    );
  });
};

// ---------------- GOOGLE MAPS: FULL ROUTE DISTANCE (OFFICE -> PICKUP -> VISIT? -> DROP -> OFFICE) ----------------
const calculateTotalDistance = async (shiftPoint) => {
  if (!window.google || !window.google.maps) {
    console.error("Google Maps API not loaded yet.");
    return 0;
  }

  const service = new window.google.maps.DistanceMatrixService();

  // Build the route sequence dynamically
  const locations = [OFFICE_ADDRESS, shiftPoint.pickupLocation];
  if (shiftPoint.visitLocation) locations.push(shiftPoint.visitLocation);
  locations.push(shiftPoint.dropLocation, OFFICE_ADDRESS);

  const getDistance = (origin, destination) =>
    new Promise((resolve) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        },
        (response, status) => {
          if (status === "OK" && response.rows?.[0]?.elements?.[0]?.status === "OK") {
            const meters = response.rows[0].elements[0].distance.value;
            resolve(meters);
          } else {
            console.error("DistanceMatrix failed:", status, response);
            resolve(0);
          }
        }
      );
    });

  let totalMeters = 0;

  for (let i = 0; i < locations.length - 1; i++) {
    const origin = locations[i];
    const destination = locations[i + 1];
    if (!origin || !destination) continue;

    const segmentDistance = await getDistance(origin, destination);
    totalMeters += segmentDistance;
  }

  const totalKilometers = totalMeters / 1000;
  return totalKilometers.toFixed(2);
};

const AddUserShift = ({ mode = "add", user }) => {
  const { id } = useParams();

  const [shiftTypes, setShiftTypes] = useState([]);
  const [shiftCategories, setShiftCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  const [initialValues, setInitialValues] = useState({
    shiftType: "",
    shiftCategory: "",
    client: "",
    user: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    description: "",
    accessToShiftReport: false,
    shiftDates: [],
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState(null);
  const [selectedShiftCategory, setSelectedShiftCategory] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState("multiple"); // "single" | "multiple"

  const navigate = useNavigate();

  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",
    redirectTo: "",
  });

  // NEW: shiftPoints derived from intake (or existing shift)
  const [shiftPoints, setShiftPoints] = useState([]);
  const [deletedShiftPoints, setDeletedShiftPoints] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoDesc, setAutoDesc] = useState("");

  // ---------------- VALIDATION SCHEMA ----------------
  const validationSchema = Yup.object().shape({
    shiftType: Yup.string().required("Shift type is required"),
    shiftCategory: Yup.string().required("Shift category is required"),
    client: Yup.string().required("Client selection is required"),
    user: Yup.string().required("User selection is required"),
    shiftDates: Yup.array()
      .of(Yup.date().typeError("Invalid date"))
      .min(1, "At least one shift date is required"),
    startTime: Yup.string()
      .required("Start time is required")
      .matches(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter a valid time in HH:MM format"
      ),
    endTime: Yup.string()
      .required("End time is required")
      .matches(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter a valid time in HH:MM format"
      ),
    description: Yup.string()
      .required("Shift description is required")
      .min(10, "Description should be at least 10 characters"),
  });

  // ---------------- FETCH DROPDOWNS ----------------
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [shiftTypeSnap, shiftCategorySnap, clientSnap, userSnap] =
          await Promise.all([
            getDocs(collection(db, "shiftTypes")),
            getDocs(collection(db, "shiftCategories")),
            getDocs(collection(db, "clients")),
            getDocs(collection(db, "users")),
          ]);

        setShiftTypes(
          shiftTypeSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setShiftCategories(
          shiftCategorySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setClients(clientSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setUsers(userSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching dropdown data: ", error);
      }
    };
    fetchDropdownData();
  }, []);

  // ---------------- DATE HELPERS ----------------
  const formatDateFromFirestore = (dateValue) => {
    if (!dateValue) return "";

    if (dateValue.toDate) {
      const d = dateValue.toDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (typeof dateValue === "string") {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed)) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    return "";
  };

  const normalizeDate = (input) => {
    if (input instanceof Date) return input;
    if (input?.toDate) return input.toDate();

    const direct = new Date(input);
    if (!isNaN(direct)) return direct;

    const parts = String(input).split(" ");
    if (parts.length === 3) {
      const [day, monthName, year] = parts;
      const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(monthName);

      if (monthIndex !== -1) {
        return new Date(Number(year), monthIndex, Number(day));
      }
    }

    throw new Error("Invalid date format: " + input);
  };

  // ---------------- UPDATE MODE: FETCH EXISTING SHIFT ----------------
  useEffect(() => {
    const fetchShiftData = async () => {
      if (mode === "update" && id) {
        try {
          const docRef = doc(db, "shifts", id);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) return;
          const data = docSnap.data();

          // ✅ Normalize field names across old/new schemas
          const shiftTypeName =
            data.shiftType || data.typeName || data.shiftTypeName || "";
          const shiftCategoryName =
            data.shiftCategory ||
            data.categoryName ||
            data.shiftCategoryName ||
            "";

          const clientName =
            data.clientName ||
            data.clientDetails?.name ||
            data.clientDetails?.fullName ||
            "";

          const userName =
            data.name || data.userName || data.userDetails?.name || "";

          // ✅ Match type & category safely (case-insensitive)
          const shiftTypeObj = shiftTypes.find(
            (s) =>
              s.name?.toLowerCase() === shiftTypeName.toLowerCase() ||
              s.id === shiftTypeName
          );

          const shiftCategoryObj = shiftCategories.find(
            (c) =>
              c.name?.toLowerCase() === shiftCategoryName.toLowerCase() ||
              c.id === shiftCategoryName
          );

          // ✅ Match client & user safely
          const clientObj = clients.find(
            (c) =>
              c.name?.toLowerCase() === clientName.toLowerCase() ||
              c.id === data.client ||
              c.id === data.clientId
          );

          const userObj = users.find(
            (u) =>
              u.name?.toLowerCase() === userName.toLowerCase() ||
              u.id === data.user ||
              u.id === data.userId
          );

          // ✅ Normalize dates
          const startISO = formatDateFromFirestore(data.startDate);
          const endISO = formatDateFromFirestore(data.endDate);

          const calendarDates = [];
          if (startISO) calendarDates.push(new Date(startISO));

          // ✅ SHIFT POINTS: keep all points
          let points = [];

          if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
            points = data.shiftPoints.map((p) => ({
              childName: p.childName || "",
              pickupLocation: p.pickupLocation || "",
              pickupTime: p.pickupTime || "",
              pickupLatitude: p.pickupLatitude || 0,
              pickupLongitude: p.pickupLongitude || 0,

              visitLocation: p.visitLocation || "",
              visitStartTime: p.visitStartTime || "",
              visitEndTime: p.visitEndTime || "",
              visitLatitude: p.visitLatitude || 0,
              visitLongitude: p.visitLongitude || 0,

              dropLocation: p.dropLocation || "",
              dropTime: p.dropTime || "",
              dropLatitude: p.dropLatitude || 0,
              dropLongitude: p.dropLongitude || 0,

              seatType: p.seatType || "",
              transportationMode: p.transportationMode || "",

              totalKilometers:
                p.totalKilometers !== undefined && p.totalKilometers !== null
                  ? Number(p.totalKilometers)
                  : 0,
            }));
          } else {
            points = [];
          }

          setShiftPoints(points);

          // ✅ Prefill all fields
          setInitialValues((prev) => ({
            ...prev,
            shiftType: shiftTypeObj ? shiftTypeObj.name : shiftTypeName,
            shiftCategory: shiftCategoryObj
              ? shiftCategoryObj.name
              : shiftCategoryName,
            client: clientObj ? clientObj.id : "",
            user: userObj ? userObj.id : "",
            startDate: startISO,
            endDate: endISO,
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            description: data.jobdescription || data.description || "",
            accessToShiftReport: data.accessToShiftReport || false,
            shiftDates: calendarDates,
          }));
        } catch (error) {
          console.error("Error fetching shift for update:", error);
        }
      }
    };

    if (shiftTypes.length && shiftCategories.length && clients.length && users.length) {
      fetchShiftData();
    }
  }, [mode, id, shiftTypes, shiftCategories, clients, users, refreshKey]);

  // ---------------- FETCH SHIFT POINTS FROM INTAKE FOR SELECTED CLIENT ----------------
  // ---------------- FETCH SHIFT POINTS FROM INTAKE FOR SELECTED CLIENT ----------------
  useEffect(() => {
    const loadShiftPointsFromIntake = async () => {
      if (!selectedClient) {
        if (mode !== "update") setShiftPoints([]);
        setDeletedShiftPoints([]); // Valid clear
        return;
      }

      // If we are editing an existing shift that already has shiftPoints, don't override
      if (mode === "update" && Array.isArray(shiftPoints) && shiftPoints.length > 0) {
        return;
      }

      try {
        // ✅ 1. NEW STRUCTURE: Does the client document already have shiftPoints? (Jamwal Family has this)
        if (Array.isArray(selectedClient.shiftPoints) && selectedClient.shiftPoints.length > 0) {
          console.log("Using shift points directly from client doc:", selectedClient.shiftPoints);
          setShiftPoints(selectedClient.shiftPoints);
          setDeletedShiftPoints([]);
          return;
        }

        // ✅ 2. OLD STRUCTURE: Fallback to searching IntakeForms if client doc doesn't have shiftPoints
        const clientNameCandidate =
          (selectedClient.name || selectedClient.fullName || "").trim();
        const clientIdCandidate =
          String(selectedClient.id || selectedClient.clientId || "").trim();

        const snap = await getDocs(collection(db, "InTakeForms"));

        let foundPoints = [];

        snap.forEach((d) => {
          if (foundPoints.length) return;

          const data = d.data();

          // ✅ Identify the correct intake form for this client FIRST
          const intakeClientId = String(data.clientId || "").trim();
          const intakeNameInClientTable = String(data.nameInClientTable || "").trim();

          const isThisClient =
            (clientIdCandidate && intakeClientId && intakeClientId === clientIdCandidate) ||
            (clientNameCandidate &&
              intakeNameInClientTable &&
              intakeNameInClientTable.toLowerCase() === clientNameCandidate.toLowerCase());

          if (!isThisClient) return;

          // ✅ OLD FORMAT: build shift points from inTakeClients[] (children)
          if (Array.isArray(data.inTakeClients) && data.inTakeClients.length) {
            const pointsFromChildren = data.inTakeClients
              .filter((cl) => {
                const serviceRequired = Array.isArray(cl.serviceRequired)
                  ? cl.serviceRequired
                  : [];
                const hasTransportation =
                  serviceRequired.includes("Transportation") ||
                  (cl.purposeOfTransportation &&
                    String(cl.purposeOfTransportation).toLowerCase() !== "no transport");

                // Must have at least pickup or drop or visit to be a usable point
                const hasAnyAddress =
                  (cl.pickupAddress && String(cl.pickupAddress).trim() !== "") ||
                  (cl.dropAddress && String(cl.dropAddress).trim() !== "") ||
                  (cl.visitAddress && String(cl.visitAddress).trim() !== "");

                return hasTransportation && hasAnyAddress;
              })
              .map((cl) => ({
                // optional: keep child name for UI/debug
                childName: cl.name || "",

                pickupLocation: cl.pickupAddress || "",
                pickupTime: cl.pickupTime || "",

                visitLocation: cl.visitAddress || "",
                visitStartTime: cl.startVisitTime || "",
                visitEndTime: cl.endVisitTime || "",

                dropLocation: cl.dropAddress || "",
                dropTime: cl.dropTime || "",

                seatType: cl.typeOfSeat || "",
                transportationMode:
                  cl.purposeOfTransportation || cl.transportationMode || "",

                totalKilometers: 0,
              }));

            if (pointsFromChildren.length) {
              foundPoints = pointsFromChildren;
              return;
            }
          }

          // ✅ NEW FORMAT: clients map with transportation sub-object
          // (kept for backward/other intakes you may have)
          if (data.clients && typeof data.clients === "object") {
            const pointsFromMap = [];

            Object.values(data.clients).forEach((c) => {
              const cName = (c.fullName || c.name || "").trim();
              if (!cName) return;

              // If your new format stores multiple clients under the same intake,
              // we still only pull shiftPoints for the selected client name.
              // If you want "all children", remove this if-block.
              if (
                clientNameCandidate &&
                cName.toLowerCase() !== clientNameCandidate.toLowerCase()
              ) {
                return;
              }

              const t = c.transportation || {};

              if (Array.isArray(t.shiftPoints) && t.shiftPoints.length) {
                t.shiftPoints.forEach((sp) => {
                  pointsFromMap.push({
                    childName: sp.childName || cName || "",
                    pickupLocation: sp.pickupAddress || sp.pickupLocation || "",
                    pickupTime: sp.pickupTime || "",
                    visitLocation: sp.visitAddress || sp.visitLocation || "",
                    visitStartTime: sp.startVisitTime || sp.visitStartTime || "",
                    visitEndTime: sp.endVisitTime || sp.visitEndTime || "",
                    dropLocation: sp.dropAddress || sp.dropLocation || "",
                    dropTime: sp.dropTime || "",
                    seatType: sp.typeOfSeat || sp.seatType || "",
                    transportationMode:
                      sp.purposeOfTransportation || sp.transportationMode || "",
                    totalKilometers:
                      sp.totalKilometers !== undefined && sp.totalKilometers !== null
                        ? Number(sp.totalKilometers)
                        : 0,
                  });
                });
              } else {
                // fallback single transportation object
                const hasAny =
                  (t.pickupAddress && String(t.pickupAddress).trim() !== "") ||
                  (t.dropAddress && String(t.dropAddress).trim() !== "") ||
                  (t.visitAddress && String(t.visitAddress).trim() !== "");

                if (hasAny) {
                  pointsFromMap.push({
                    childName: cName || "",
                    pickupLocation: t.pickupAddress || "",
                    pickupTime: t.pickupTime || "",
                    visitLocation: t.visitAddress || "",
                    visitStartTime: t.startVisitTime || "",
                    visitEndTime: t.endVisitTime || "",
                    dropLocation: t.dropAddress || "",
                    dropTime: t.dropTime || "",
                    seatType: t.typeOfSeat || "",
                    transportationMode:
                      t.purposeOfTransportation || t.transportationMode || "",
                    totalKilometers: 0,
                  });
                }
              }
            });

            if (pointsFromMap.length) {
              foundPoints = pointsFromMap;
              return;
            }
          }
        });

        setShiftPoints(foundPoints.length ? foundPoints : []);
        setDeletedShiftPoints([]); // Clear deleted points when loading new client data
      } catch (err) {
        console.error("Error loading shift points from intake:", err);
        setShiftPoints([]);
        setDeletedShiftPoints([]);
      }
    };

    loadShiftPointsFromIntake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, mode]);


  // ---------------- AUTO-FILL DESCRIPTION FROM INTAKE FORM ----------------
  useEffect(() => {
    if (!selectedClient || mode === "update") return;

    const fetchDescFromIntake = async () => {
      try {
        const clientId = selectedClient.id || "";
        const clientName = (selectedClient.name || selectedClient.fullName || "").trim().toLowerCase();
        // Extract last name / key words from family name (e.g. "Kaskamin Family" → "kaskamin")
        const nameParts = clientName.replace(/family$/i, "").trim().split(/\s+/);

        console.log("🔍 Searching intake for client:", { clientId, clientName, nameParts });

        const snap = await getDocs(collection(db, "InTakeForms"));
        let foundDesc = "";
        let foundIntakeId = "";

        snap.forEach((d) => {
          if (foundDesc) return;
          const data = d.data();

          // ── 1. MATCH BY clientId on root of intake form ────────────────
          const clientIdMatch =
            clientId && (
              data.clientId === clientId ||
              data.id === clientId ||
              data.clientCode === clientId
            );

          // ── 2. MATCH BY nameInClientTable (old format) ─────────────────
          const intakeName = (data.nameInClientTable || "").trim().toLowerCase();
          const oldNameMatch = clientName && intakeName && intakeName === clientName;

          // ── 3. PARTIAL NAME MATCH (family surname anywhere in intake name)
          const partialMatch = nameParts.length > 0 && nameParts.some(part =>
            part.length > 3 && intakeName.includes(part)
          );

          // ── 4. MATCH WITHIN inTakeClients[] array (old format children) ─
          const oldClientArrayMatch =
            Array.isArray(data.inTakeClients) &&
            data.inTakeClients.some((c) => {
              const n = (c.name || "").trim().toLowerCase();
              return n === clientName || nameParts.some(p => p.length > 3 && n.includes(p));
            });

          // ── 5. MATCH WITHIN clients map (new format) ───────────────────
          const newFormatClients = data.clients && typeof data.clients === "object"
            ? Object.values(data.clients)
            : [];
          const newClientMapMatch = newFormatClients.some((c) => {
            const cName = (c.fullName || c.name || "").trim().toLowerCase();
            return cName === clientName || nameParts.some(p => p.length > 3 && cName.includes(p));
          });

          const isMatch = clientIdMatch || oldNameMatch || partialMatch || oldClientArrayMatch || newClientMapMatch;

          if (!isMatch) return;

          console.log("✅ Intake form matched:", d.id, { clientIdMatch, oldNameMatch, partialMatch, oldClientArrayMatch, newClientMapMatch });

          // ── EXTRACT SERVICE DESCRIPTION ────────────────────────────────
          // Priority: new format services.serviceDesc > old inTakeClients[0].serviceDetail > root
          const newDesc = data.services?.serviceDesc || "";
          const oldDesc = (Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.serviceDetail) || "";
          const rootDesc = data.serviceDesc || data.serviceDetail || "";

          foundDesc = newDesc || oldDesc || rootDesc;
          foundIntakeId = d.id;

          console.log("📄 Service desc found:", foundDesc ? `${foundDesc.substring(0, 80)}...` : "(empty)");
        });

        if (foundDesc) {
          setAutoDesc(foundDesc);
        } else {
          console.warn("⚠️ No service description found for client:", clientName, "/ id:", clientId);
        }
      } catch (err) {
        console.error("Error loading description from intake:", err);
      }
    };

    fetchDescFromIntake();
  }, [selectedClient]);



  // ---------------- CALCULATE KM PER SHIFT POINT ----------------
  const handleCalculateKilometers = async (index) => {
    const sp = shiftPoints[index];
    if (!sp?.pickupLocation || !sp?.dropLocation) {
      alert("Please enter both pickup and drop locations first.");
      return;
    }

    try {
      const km = await calculateTotalDistance(sp);
      setShiftPoints((prev) =>
        prev.map((p, i) => (i === index ? { ...p, totalKilometers: km } : p))
      );
    } catch (err) {
      console.error("Error calculating total distance:", err);
      alert("Failed to calculate total kilometers.");
    }
  };

  // ---------------- SUBMIT HANDLER ----------------
  const handleSubmit = async (values, { resetForm }) => {
    try {
      const { shiftDates, ...restValues } = values;
      const selectedDates = shiftDates || [];

      if (!selectedDates.length) {
        alert("Please select at least one shift date.");
        return;
      }

      // ✅ SAVE ALL SHIFT POINTS (not just first)
      const finalPoints = (shiftPoints || []).map((fp) => ({
        childName: fp.childName || "",
        pickupLocation: fp.pickupLocation || "",
        pickupTime: fp.pickupTime || "",
        pickupLatitude: fp.pickupLatitude || 0,
        pickupLongitude: fp.pickupLongitude || 0,

        visitLocation: fp.visitLocation || "",
        visitStartTime: fp.visitStartTime || "",
        visitEndTime: fp.visitEndTime || "",
        visitLatitude: fp.visitLatitude || 0,
        visitLongitude: fp.visitLongitude || 0,

        dropLocation: fp.dropLocation || "",
        dropTime: fp.dropTime || "",
        dropLatitude: fp.dropLatitude || 0,
        dropLongitude: fp.dropLongitude || 0,

        seatType: fp.seatType || "",
        transportationMode: fp.transportationMode || "",
        purposeOfTransportation: fp.purposeOfTransportation || "",

        totalKilometers: Number(fp.totalKilometers) || 0,
      }));

      // ---------- UPDATE MODE ----------
      if (mode === "update" && id) {
        const docRef = doc(db, "shifts", id);

        const primaryDate = normalizeDate(selectedDates[0]);
        const isOvernight = values.endTime < values.startTime;
        let endDateObj = new Date(primaryDate);
        if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

        await updateDoc(docRef, {
          ...restValues,
          startDate: Timestamp.fromDate(primaryDate),
          endDate: Timestamp.fromDate(endDateObj),
          clientDetails: selectedClient,
          updatedAt: new Date(),
          shiftPoints: finalPoints,
          clockIn: "",
          clockOut: "",
          isRatified: false,
          isCancelled: false,
          dateKey: primaryDate.toISOString().split("T")[0],
        });

        setSlider({
          show: true,
          title: "Shift Updated Successfully!",
          subtitle: `${selectedClient?.name || ""} on ${primaryDate.toDateString()} at ${values.startTime}`,
          redirectTo: "/admin-dashboard/dashboard",
        });

        // Re-fetch updated data so form shows current values
        setRefreshKey((k) => k + 1);
        return;
      }

      // ---------- ADD MODE ----------
      for (const date of selectedDates) {
        const startDateObj = normalizeDate(date);
        const newShiftId = Date.now().toString();

        const isOvernight = values.endTime < values.startTime;
        let endDateObj = new Date(startDateObj);
        if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

        await setDoc(doc(db, "shifts", newShiftId), {
          ...values,
          userId: selectedUser?.userId,
          userName: selectedUser?.name || "",
          startDate: startDateObj,
          endDate: endDateObj,
          clientDetails: selectedClient,
          createdAt: new Date(),
          shiftReport: "",
          shiftConfirmed: false,
          id: newShiftId,
          shiftPoints: finalPoints, // ✅ store all points
          clockIn: "",
          clockOut: "",
          isRatify: false,
          isCancelled: false,
        });

        // ✅ SEND ADMIN NOTIFICATION
        const adminQuery = query(
          collection(db, "users"),
          where("role", "==", "admin")
        );
        const adminsSnapshot = await getDocs(adminQuery);
        for (const admin of adminsSnapshot.docs) {
          await sendNotification(admin.id, {
            type: "info",
            title: "New Shift Created",
            message: `A new shift has been added for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
            senderId: user.name,
            meta: {
              shiftId: newShiftId,
              entity: "Shift",
              date: startDateObj.toDateString(),
            },
          });
        }

        // ✅ SEND STAFF NOTIFICATION
        if (values.user) {
          try {
            await sendNotification(values.user, {
              type: "info",
              title: "New Shift Assigned",
              message: `You have been assigned a new shift for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
              senderId: user.name,
              meta: {
                shiftId: newShiftId,
                entity: "Shift",
                date: startDateObj.toDateString(),
              },
            });
          } catch (err) {
            console.error("Error sending staff notification:", err);
          }
        }
      }

      // ✅ SUCCESS SLIDER
      const firstDate = normalizeDate(selectedDates[0]);
      setSlider({
        show: true,
        title: "Shifts Created Successfully!",
        subtitle: `${selectedClient?.name || ""} – ${selectedDates.length} day(s) starting ${firstDate.toDateString()} at ${values.startTime}`,
        redirectTo: "/admin-dashboard/dashboard",
      });

      resetForm();
      setShiftPoints([]);
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };

  // ---------------- RENDER ----------------
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <p className="font-bold text-2xl leading-7 text-light-black flex">
          {mode === "update" ? "Update Shift" : "Add Shift"}
        </p>

        {mode === "update" && (
          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to delete this shift?")) {
                try {
                  await deleteDoc(doc(db, "shifts", id));
                  alert("Shift deleted successfully!");
                  window.history.back();
                } catch (err) {
                  console.error("Error deleting shift:", err);
                  alert("Failed to delete shift. Please try again.");
                }
              }
            }}
            className="bg-[#C70036] text-white px-4 py-2 rounded hover:bg-[#A0002C] transition flex"
          >
            Delete Shift
          </button>
        )}
      </div>

      <hr className="border-t border-gray" />

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values, setFieldValue }) => {
          // sync client/user/type/category objects
          useEffect(() => {
            const clientData = clients.find((c) => c.id === values.client);
            setSelectedClient(clientData || null);

            const userData = users.find((u) => u.id === values.user);
            setSelectedUser(userData || null);

            const shiftTypeData = shiftTypes.find((s) => s.id === values.shiftType);
            setSelectedShiftType(shiftTypeData || null);

            const shiftCategoryData = shiftCategories.find(
              (s) => s.name === values.shiftCategory
            );
            setSelectedShiftCategory(shiftCategoryData || null);
          }, [values.client, values.user, values.shiftType, values.shiftCategory]);

          // Auto-fill description from intake when autoDesc changes
          useEffect(() => {
            if (autoDesc) {
              setFieldValue("description", autoDesc);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
          }, [autoDesc]);


          const handleDatesChange = (dates) => {
            const selected = dates || [];
            setFieldValue("shiftDates", selected);

            if (selected.length > 0) {
              const sorted = [...selected].sort((a, b) => a - b);
              const first = sorted[0];
              const last = sorted[sorted.length - 1];

              const toISO = (d) => d.toISOString().split("T")[0];
              setFieldValue("startDate", toISO(first));
              setFieldValue("endDate", toISO(last));
            } else {
              setFieldValue("startDate", "");
              setFieldValue("endDate", "");
            }
          };

          return (
            <Form className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4">
                {/* Shift Type */}
                <div className="relative">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Shift Type
                  </label>
                  <Field
                    as="select"
                    name="shiftType"
                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                      ${touched.shiftType && errors.shiftType
                        ? "border-red-500"
                        : "border-light-gray"
                      }
                      ${values.shiftType ? "text-black" : "text-[#72787E] text-sm"
                      }`}
                  >
                    <option value="" className="text-[#72787E]">
                      Please select the shift type
                    </option>
                    {shiftTypes.map((item) => (
                      <option key={item.id} value={item.name} className="text-black">
                        {item.name}
                      </option>
                    ))}
                  </Field>
                  <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown className="text-light-green w-4 h-4" />
                  </span>
                  <ErrorMessage
                    name="shiftType"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Shift Category */}
                <div className="relative">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Shift Category
                  </label>
                  <Field
                    as="select"
                    name="shiftCategory"
                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                      ${touched.shiftCategory && errors.shiftCategory
                        ? "border-red-500"
                        : "border-light-gray"
                      }
                      ${values.shiftCategory ? "text-black" : "text-[#72787E] text-sm"
                      }`}
                  >
                    <option value="" className="text-gray-400">
                      Please select the shift category
                    </option>
                    {shiftCategories.map((item) => (
                      <option key={item.id} value={item.name} className="text-black">
                        {item.name}
                      </option>
                    ))}
                  </Field>
                  <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown className="text-light-green w-4 h-4" />
                  </span>
                  <ErrorMessage
                    name="shiftCategory"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Client */}
                <div className="relative">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Select Client
                  </label>
                  <Field
                    as="select"
                    name="client"
                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                      ${touched.client && errors.client
                        ? "border-red-500"
                        : "border-light-gray"
                      }
                      ${values.client ? "text-black" : "text-[#72787E] text-sm"}`}
                  >
                    <option value="" className="text-gray-400">
                      Please select a client
                    </option>
                    {clients.map((item) => (
                      <option key={item.id} value={item.id} className="text-black">
                        {item.name}
                      </option>
                    ))}
                  </Field>
                  <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown className="text-light-green w-4 h-4" />
                  </span>
                  <ErrorMessage
                    name="client"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* User */}
                <div className="relative">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Select User
                  </label>
                  <Field
                    as="select"
                    name="user"
                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                      ${touched.user && errors.user
                        ? "border-red-500"
                        : "border-light-gray"
                      }
                      ${values.user ? "text-black" : "text-[#72787E] text-sm"}`}
                  >
                    <option value="" className="text-gray-400">
                      Please select a user
                    </option>
                    {users.map((item) => (
                      <option key={item.id} value={item.id} className="text-black">
                        {item.name}
                      </option>
                    ))}
                  </Field>
                  <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown className="text-light-green w-4 h-4" />
                  </span>
                  <ErrorMessage name="user" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Shift Dates */}
                <div className="col-span-2">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Shift Dates
                  </label>

                  {/* Shift Dates — Multiple mode always */}

                  <div
                    onClick={() => setShowCalendar(true)}
                    className="mt-1 w-56 border border-light-gray rounded-sm px-3 py-2 flex items-center justify-between cursor-pointer bg-white"
                  >
                    <span className="text-gray-600 text-sm">
                      {values.shiftDates?.length > 0
                        ? `${values.shiftDates.length} date(s) selected`
                        : "Select dates"}
                    </span>

                    <FaRegCalendarAlt className="text-dark-green text-lg" />
                  </div>

                  <ErrorMessage name="shiftDates" component="div" className="text-red-500 text-xs mt-1" />

                  {showCalendar && (
                    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                      <div className="bg-white p-5 rounded-md shadow-lg min-w-[360px]">
                        <h2 className="text-lg font-bold mb-3 text-light-black">
                          {calendarMode === "single" ? "Select Shift Date" : "Select Shift Dates"}
                        </h2>

                        <DayPicker
                          mode="multiple"
                          selected={values.shiftDates}
                          onSelect={(dates) => handleDatesChange(dates)}
                          className="custom-daypicker-green"
                        />

                        <div className="flex justify-end gap-3 mt-4">
                          <button
                            onClick={() => setShowCalendar(false)}
                            className="px-4 py-1 border border-gray-400 rounded"
                            type="button"
                          >
                            Cancel
                          </button>

                          <button
                            onClick={() => setShowCalendar(false)}
                            className="px-4 py-1 bg-dark-green text-white rounded"
                            type="button"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Start Time */}
                <div>
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Start Time
                  </label>
                  <Field
                    name="startTime"
                    type="text"
                    placeholder="HH:MM(24 Hrs Format)"
                    className={`w-full border rounded-sm p-[10px] placeholder:text-sm
                      ${touched.startTime && errors.startTime
                        ? "border-red-500"
                        : "border-light-gray"
                      }`}
                  />
                  <ErrorMessage name="startTime" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* End Time */}
                <div>
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    End Time
                  </label>
                  <Field
                    name="endTime"
                    type="text"
                    placeholder="HH:MM(24 Hrs Format)"
                    className={`w-full border rounded-sm p-[10px] placeholder:text-sm
                      ${touched.endTime && errors.endTime
                        ? "border-red-500"
                        : "border-light-gray"
                      }`}
                  />
                  <ErrorMessage name="endTime" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Access To Shift Report */}
                <div className="col-span-2 ">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Access to Shift Report
                  </label>

                  <div className="flex items-center gap-4 mt-2">
                    <span>No</span>

                    <Field name="accessToShiftReport">
                      {({ field, form }) => (
                        <div
                          onClick={() =>
                            form.setFieldValue("accessToShiftReport", !field.value)
                          }
                          className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition 
                            ${field.value ? "bg-dark-green" : "bg-gray-400"}`}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow transform transition 
                              ${field.value ? "translate-x-6" : "translate-x-0"}`}
                          ></div>
                        </div>
                      )}
                    </Field>

                    <span>Yes</span>
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                    Description of Shift
                  </label>
                  <Field
                    as="textarea"
                    name="description"
                    placeholder="Write the description of the Shift"
                    className={`w-full border rounded-sm p-[10px] h-50 placeholder:text-sm
                      ${touched.description && errors.description
                        ? "border-red-500"
                        : "border-light-gray"
                      }`}
                  />
                  <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* ✅ MULTI SHIFT POINTS (TRANSPORTATION) SECTION */}
                {selectedClient && (
                  <div className="col-span-2">
                    <p className="font-bold text-sm text-light-black">Shift Points</p>

                    {shiftPoints.length > 0 ? (
                      <div className="flex flex-col gap-4 mt-2">
                        {shiftPoints.map((point, index) => (
                          <div
                            key={index}
                            className="border border-light-gray rounded-sm p-4 relative"
                          >
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-semibold text-sm text-[#44474B]">
                                Shift Point {index + 1} {point.childName ? `- ${point.childName}` : point.name ? `- ${point.name}` : selectedClient?.name ? `- ${selectedClient.name}` : ""}
                              </p>

                              <div className="flex items-center gap-3">
                                {/* Swap */}
                                <button
                                  type="button"
                                  className="text-dark-green text-sm underline cursor-pointer"
                                  onClick={() => {
                                    const swapped = {
                                      ...point,
                                      pickupLocation: point.dropLocation,
                                      dropLocation: point.pickupLocation,
                                    };

                                    setShiftPoints((prev) =>
                                      prev.map((p, i) => (i === index ? swapped : p))
                                    );
                                  }}
                                >
                                  Swap Pickup / Drop
                                </button>

                                {/* Delete (cross) */}
                                <button
                                  type="button"
                                  className="text-[#C70036] text-lg font-bold leading-none"
                                  title="Remove shift point"
                                  onClick={() => {
                                    const pointToRemove = shiftPoints[index];
                                    setDeletedShiftPoints((prev) => [...prev, pointToRemove]);
                                    setShiftPoints((prev) => prev.filter((_, i) => i !== index));
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm">
                              {/* PICKUP LOCATION */}
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[#44474B]">
                                  Pickup Location
                                </span>

                                <div className="flex items-center gap-2">
                                  {!point.pickupLocation_edit ? (
                                    <p
                                      className="font-medium truncate max-w-[220px] cursor-pointer"
                                      onClick={() =>
                                        setShiftPoints((prev) =>
                                          prev.map((p, i) =>
                                            i === index
                                              ? { ...p, pickupLocation_edit: true }
                                              : p
                                          )
                                        )
                                      }
                                      title={point.pickupLocation}
                                    >
                                      {point.pickupLocation || "N/A"}
                                    </p>
                                  ) : (
                                    <input
                                      type="text"
                                      autoFocus
                                      className="border border-light-gray rounded-sm p-[6px] text-sm w-full"
                                      value={point.pickupLocation || ""}
                                      onChange={async (e) => {
                                        const updatedPickup = e.target.value;
                                        let updatedPoint = {
                                          ...point,
                                          pickupLocation: updatedPickup,
                                        };

                                        if (
                                          updatedPickup &&
                                          point.dropLocation &&
                                          window.google
                                        ) {
                                          const km = await calculateDistance(
                                            updatedPickup,
                                            point.dropLocation
                                          );
                                          updatedPoint.totalKilometers = km;
                                        }

                                        setShiftPoints((prev) =>
                                          prev.map((p, i) =>
                                            i === index ? updatedPoint : p
                                          )
                                        );
                                      }}
                                      onBlur={() =>
                                        setShiftPoints((prev) =>
                                          prev.map((p, i) =>
                                            i === index
                                              ? { ...p, pickupLocation_edit: false }
                                              : p
                                          )
                                        )
                                      }
                                    />
                                  )}

                                  <FaRegMap
                                    className="text-dark-green text-lg cursor-pointer hover:opacity-70"
                                    onClick={() =>
                                      window.open(
                                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                          point.pickupLocation || ""
                                        )}`,
                                        "_blank"
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {/* PICKUP TIME */}
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[#44474B]">
                                  Pickup Time
                                </span>

                                {!point.pickupTime_edit ? (
                                  <p
                                    className="font-medium cursor-pointer"
                                    onClick={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, pickupTime_edit: true } : p
                                        )
                                      )
                                    }
                                  >
                                    {point.pickupTime || "N/A"}
                                  </p>
                                ) : (
                                  <input
                                    type="text"
                                    autoFocus
                                    className="border border-light-gray rounded-sm p-[6px] text-sm"
                                    value={point.pickupTime || ""}
                                    onChange={(e) =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, pickupTime: e.target.value } : p
                                        )
                                      )
                                    }
                                    onBlur={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, pickupTime_edit: false } : p
                                        )
                                      )
                                    }
                                  />
                                )}
                              </div>

                              {/* DROP LOCATION */}
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[#44474B]">
                                  Drop Location
                                </span>

                                <div className="flex items-center gap-2">
                                  {!point.dropLocation_edit ? (
                                    <p
                                      className="font-medium truncate max-w-[220px] cursor-pointer"
                                      title={point.dropLocation}
                                      onClick={() =>
                                        setShiftPoints((prev) =>
                                          prev.map((p, i) =>
                                            i === index
                                              ? { ...p, dropLocation_edit: true }
                                              : p
                                          )
                                        )
                                      }
                                    >
                                      {point.dropLocation || "N/A"}
                                    </p>
                                  ) : (
                                    <input
                                      type="text"
                                      autoFocus
                                      className="border border-light-gray rounded-sm p-[6px] text-sm w-full"
                                      value={point.dropLocation || ""}
                                      onChange={async (e) => {
                                        const updatedDrop = e.target.value;
                                        let updatedPoint = {
                                          ...point,
                                          dropLocation: updatedDrop,
                                        };

                                        if (
                                          point.pickupLocation &&
                                          updatedDrop &&
                                          window.google
                                        ) {
                                          const km = await calculateDistance(
                                            point.pickupLocation,
                                            updatedDrop
                                          );
                                          updatedPoint.totalKilometers = km;
                                        }

                                        setShiftPoints((prev) =>
                                          prev.map((p, i) =>
                                            i === index ? updatedPoint : p
                                          )
                                        );
                                      }}
                                      onBlur={() =>
                                        setShiftPoints((prev) =>
                                          prev.map((p, i) =>
                                            i === index
                                              ? { ...p, dropLocation_edit: false }
                                              : p
                                          )
                                        )
                                      }
                                    />
                                  )}

                                  <FaRegMap
                                    className="text-dark-green text-lg cursor-pointer hover:opacity-70"
                                    onClick={() =>
                                      window.open(
                                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                          point.dropLocation || ""
                                        )}`,
                                        "_blank"
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {/* DROP TIME */}
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[#44474B]">
                                  Drop Time
                                </span>

                                {!point.dropTime_edit ? (
                                  <p
                                    className="font-medium cursor-pointer"
                                    onClick={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, dropTime_edit: true } : p
                                        )
                                      )
                                    }
                                  >
                                    {point.dropTime || "N/A"}
                                  </p>
                                ) : (
                                  <input
                                    type="text"
                                    autoFocus
                                    className="border border-light-gray rounded-sm p-[6px] text-sm"
                                    value={point.dropTime || ""}
                                    onChange={(e) =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, dropTime: e.target.value } : p
                                        )
                                      )
                                    }
                                    onBlur={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, dropTime_edit: false } : p
                                        )
                                      )
                                    }
                                  />
                                )}
                              </div>

                              {/* VISIT FIELDS (ONLY IF EXIST) */}
                              {point.visitLocation?.trim() !== "" && (
                                <>
                                  {/* VISIT LOCATION */}
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-[#44474B]">
                                      Visit Location
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {!point.visitLocation_edit ? (
                                        <p
                                          className="font-medium truncate max-w-[220px] cursor-pointer"
                                          title={point.visitLocation}
                                          onClick={() =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitLocation_edit: true }
                                                  : p
                                              )
                                            )
                                          }
                                        >
                                          {point.visitLocation}
                                        </p>
                                      ) : (
                                        <input
                                          type="text"
                                          autoFocus
                                          className="border border-light-gray rounded-sm p-[6px] text-sm w-full"
                                          value={point.visitLocation || ""}
                                          onChange={(e) =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitLocation: e.target.value }
                                                  : p
                                              )
                                            )
                                          }
                                          onBlur={() =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitLocation_edit: false }
                                                  : p
                                              )
                                            )
                                          }
                                        />
                                      )}

                                      <FaRegMap
                                        className="text-dark-green text-lg cursor-pointer hover:opacity-70"
                                        onClick={() =>
                                          window.open(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                              point.visitLocation || ""
                                            )}`,
                                            "_blank"
                                          )
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* VISIT DURATION */}
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-[#44474B]">
                                      Visit Duration
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {!point.visitStartTime_edit ? (
                                        <p
                                          className="font-medium cursor-pointer"
                                          onClick={() =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitStartTime_edit: true }
                                                  : p
                                              )
                                            )
                                          }
                                        >
                                          {point.visitStartTime || "N/A"}
                                        </p>
                                      ) : (
                                        <input
                                          type="text"
                                          autoFocus
                                          className="border border-light-gray rounded-sm p-[6px] text-sm w-24"
                                          value={point.visitStartTime || ""}
                                          onChange={(e) =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitStartTime: e.target.value }
                                                  : p
                                              )
                                            )
                                          }
                                          onBlur={() =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitStartTime_edit: false }
                                                  : p
                                              )
                                            )
                                          }
                                        />
                                      )}

                                      <span>–</span>

                                      {!point.visitEndTime_edit ? (
                                        <p
                                          className="font-medium cursor-pointer"
                                          onClick={() =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitEndTime_edit: true }
                                                  : p
                                              )
                                            )
                                          }
                                        >
                                          {point.visitEndTime || "N/A"}
                                        </p>
                                      ) : (
                                        <input
                                          type="text"
                                          autoFocus
                                          className="border border-light-gray rounded-sm p-[6px] text-sm w-24"
                                          value={point.visitEndTime || ""}
                                          onChange={(e) =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitEndTime: e.target.value }
                                                  : p
                                              )
                                            )
                                          }
                                          onBlur={() =>
                                            setShiftPoints((prev) =>
                                              prev.map((p, i) =>
                                                i === index
                                                  ? { ...p, visitEndTime_edit: false }
                                                  : p
                                              )
                                            )
                                          }
                                        />
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* SEAT TYPE */}
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[#44474B]">
                                  Seat Type
                                </span>

                                {!point.seatType_edit ? (
                                  <p
                                    className="font-medium cursor-pointer"
                                    onClick={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, seatType_edit: true } : p
                                        )
                                      )
                                    }
                                  >
                                    {point.seatType || "N/A"}
                                  </p>
                                ) : (
                                  <input
                                    type="text"
                                    autoFocus
                                    className="border border-light-gray rounded-sm p-[6px] text-sm"
                                    value={point.seatType || ""}
                                    onChange={(e) =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, seatType: e.target.value } : p
                                        )
                                      )
                                    }
                                    onBlur={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, seatType_edit: false } : p
                                        )
                                      )
                                    }
                                  />
                                )}
                              </div>

                              {/* TRANSPORTATION MODE */}
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[#44474B]">
                                  Transportation Mode
                                </span>

                                {!point.transportationMode_edit ? (
                                  <p
                                    className="font-medium cursor-pointer"
                                    onClick={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index
                                            ? { ...p, transportationMode_edit: true }
                                            : p
                                        )
                                      )
                                    }
                                  >
                                    {point.transportationMode || "N/A"}
                                  </p>
                                ) : (
                                  <input
                                    type="text"
                                    autoFocus
                                    className="border border-light-gray rounded-sm p-[6px] text-sm"
                                    value={point.transportationMode || ""}
                                    onChange={(e) =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index
                                            ? { ...p, transportationMode: e.target.value }
                                            : p
                                        )
                                      )
                                    }
                                    onBlur={() =>
                                      setShiftPoints((prev) =>
                                        prev.map((p, i) =>
                                          i === index
                                            ? { ...p, transportationMode_edit: false }
                                            : p
                                        )
                                      )
                                    }
                                  />
                                )}
                              </div>

                              {/* TOTAL KILOMETERS */}
                              <div className="flex flex-col gap-2">
                                <span className="font-semibold text-[#44474B]">
                                  Total Kilometers
                                </span>

                                <div className="flex items-center gap-3">
                                  <input
                                    type="text"
                                    readOnly
                                    className="border border-light-gray rounded-sm p-[6px] text-sm w-32 bg-gray-50"
                                    value={point.totalKilometers || ""}
                                    placeholder="Not calculated"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleCalculateKilometers(index)}
                                    className="bg-dark-green text-white px-3 py-1 rounded text-sm hover:opacity-90"
                                  >
                                    Calculate Total Kilometers
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">
                        No transportation details found in intake for this client.
                      </p>
                    )}

                    {/* RESTORABLE POINTS SECTION */}
                    {deletedShiftPoints.length > 0 && (
                      <div className="mt-6 border-t pt-4">
                        <p className="font-bold text-sm text-[#44474B] mb-2">Restorable Points (Deleted)</p>
                        <div className="flex flex-col gap-2">
                          {deletedShiftPoints.map((point, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-sm p-3"
                            >
                              <div className="text-xs text-gray-600">
                                <span className="font-semibold block text-gray-800">
                                  {point.pickupLocation || "Unknown Pickup"} → {point.dropLocation || "Unknown Drop"}
                                </span>
                                <span>
                                  {point.pickupTime || "--:--"} - {point.dropTime || "--:--"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShiftPoints((prev) => [...prev, point]);
                                  setDeletedShiftPoints((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-dark-green text-sm font-medium hover:underline border border-dark-green rounded px-2 py-1"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="col-span-2 flex justify-center">
                <button
                  type="submit"
                  className="bg-dark-green text-white px-6 py-2 rounded cursor-pointer"
                >
                  {mode === "update" ? "Update Shift" : "Add Shift"}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>

      <SuccessSlider
        show={slider.show}
        title={slider.title}
        subtitle={slider.subtitle}
        viewText="View Shift"
        onView={() => {
          navigate("/admin-dashboard/dashboard", {
            state: { shiftCategory: selectedShiftCategory?.name },
          });
          setSlider({ ...slider, show: false });
        }}
        onDismiss={() => setSlider({ ...slider, show: false })}
      />
    </div >
  );
};

export default AddUserShift;

