import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  getDocs,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaRegUserCircle } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa";
import SuccessSlider from "../components/SuccessSlider";
import { useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";

const AddUserShift = ({ mode = "add",user }) => {
  const{id}=useParams();

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
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState(null);
  const [selectedShiftCategory, setSelectedShiftCategory] = useState(null);

  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",
  });
  const [createdShift, setCreatedShift] = useState(null);

  // ✅ Validation Schema
  const validationSchema = Yup.object().shape({
    shiftType: Yup.string().required("Shift type is required"),
    shiftCategory: Yup.string().required("Shift category is required"),
    client: Yup.string().required("Client selection is required"),
    user: Yup.string().required("User selection is required"),
    startDate: Yup.date()
      .required("Start date is required")
      .typeError("Please enter a valid date"),
    endDate: Yup.date()
      .required("End date is required")
      .typeError("Please enter a valid date")
      .min(Yup.ref("startDate"), "End date cannot be before start date"),
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

  // ✅ Fetch dropdown data
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
          shiftTypeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setShiftCategories(
          shiftCategorySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setClients(clientSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setUsers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching dropdown data: ", error);
      }
    };
    fetchDropdownData();
  }, []);

  // ✅ If update mode, fetch existing shift data
 useEffect(() => {
  const fetchShiftData = async () => {
    if (mode === "update" && id) {
      try {
        const docRef = doc(db, "shifts", id);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const data = docSnap.data();


          // Find matching dropdown IDs
          const shiftTypeObj = shiftTypes.find((s) => s.name === data.typeName);
          const shiftCategoryObj = shiftCategories.find(
            (c) => c.name === data.categoryName
          );
          const clientObj = clients.find((c) => c.name === data.clientName);
          const userObj = users.find((u) => u.name === data.name);

          // ✅ Handle Firestore Timestamp or string date
         const formatDate = (dateValue) => {
  if (!dateValue) return "";

  // Case 1: Firestore Timestamp
  if (dateValue.toDate) {
    return dateValue.toDate().toISOString().split("T")[0];
  }

  // Case 2: String like "02 Jan 2025"
  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed)) {
      return parsed.toISOString().split("T")[0];
    }
  }

  return "";
};


          setInitialValues({
            shiftType: shiftTypeObj ? shiftTypeObj.id : "",
            shiftCategory: shiftCategoryObj ? shiftCategoryObj.id : "",
            client: clientObj ? clientObj.id : "",
            user: userObj ? userObj.id : "",
            startDate: formatDate(data.startDate),
            endDate: formatDate(data.endDate),
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            description: data.jobdescription || "",
            accessToShiftReport: data.accessToShiftReport || false,
          });
        }
      } catch (error) {
        console.error("Error fetching shift for update:", error);
      }
    }
  };

  // Run this only after dropdowns are loaded
  if (
    shiftTypes.length &&
    shiftCategories.length &&
    clients.length &&
    users.length
  ) {
    fetchShiftData();
  }
}, [mode, id, shiftTypes, shiftCategories, clients, users]);


  // ✅ Save or update shift
  const handleSubmit = async (values, { resetForm }) => {
    try {
       const shiftId = mode === "update" ? id : Date.now().toString();

      if (mode === "update" && id) {
         const usersRef = collection(db, "shifts");
    const q = query(usersRef, where("id", "==", id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;

      // ✅ Format start and end date properly (same format as your stored value)
      const formatDateForStorage = (date) =>
        new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

      await updateDoc(docRef, {
        ...values,
        startDate: formatDateForStorage(values.startDate),
        endDate: formatDateForStorage(values.endDate),
        clientDetails: selectedClient,
        updatedAt: new Date(),
      });

      setSlider({
          show: true,
          title: "Shift Updated Successfully!",
          subtitle: `${values.client} ${values.startDate} at ${values.startTime}`,
        });

      console.log("Shift updated successfully!");
    } else {
      console.error("No shift found with the given ID.");
    }
        

        
      } else {
        await addDoc(collection(db, "dev_shifts"), {
          ...values,
          clientDetails: selectedClient,
          createdAt: new Date(),
          shiftReport: "",
          shiftConfirmed: false,
        });

        setSlider({
          show: true,
          title: "Shift Created Successfully!",
          subtitle: `${values.client} ${values.startDate} at ${values.startTime}`,
        });
      }
      //get all admin user
             const q = query(collection(db, "users"), where("role", "==", "admin"));
              const adminsSnapshot = await getDocs(q);
              const admins = adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
              // Send notification to each admin
              for (const admin of admins) {
                await sendNotification(admin.id, {
                  type: "info",
                  title: mode === "add" ? "New Shift Created" : "Shift Updated",
                  message:
                    mode === "add"
                      ? `A new Shift  has been added for "${values.name}".`
                      : `Shift for "${values.name}" has been updated.`,
                  senderId: user.name, 
                  meta: {
                    shiftId: shiftId,
                    clientName: values.name,
                    entity:"Shift"
                  },
                });
      }


      setCreatedShift(values);
      resetForm();
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-bold text-2xl leading-7 text-light-black">
        {mode === "update" ? "Update  Shift" : "Add  Shift"}
      </p>
      <hr className="border-t border-gray" />

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values }) => {
          // Sync selected dropdowns
          useEffect(() => {
            const clientData = clients.find((c) => c.id === values.client);
            setSelectedClient(clientData || null);

            const userData = users.find((u) => u.id === values.user);
            setSelectedUser(userData || null);

            const shiftTypeData = shiftTypes.find(
              (s) => s.id === values.shiftType
            );
            setSelectedShiftType(shiftTypeData || null);

            const shiftCategoryData = shiftCategories.find(
              (s) => s.id === values.shiftCategory
            );
            setSelectedShiftCategory(shiftCategoryData || null);
          }, [
            values.client,
            values.user,
            values.shiftType,
            values.shiftCategory,
          ]);

          return (
            <Form className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4">

  {/* ✅ Shift Type */}
  <div className="relative">
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Shift Type</label>
    <Field
      as="select"
      name="shiftType"
      className={`w-full border rounded-sm p-[10px] appearance-none pr-10
        ${touched.shiftType && errors.shiftType ? "border-red-500" : "border-light-gray"}
        ${values.shiftType ? "text-black" : "text-[#72787E] text-sm"}`}
    >
      <option value="" className="text-[#72787E] ">Please select the shift type</option>
      {shiftTypes.map((item) => (
        <option key={item.id} value={item.id} className="text-black">{item.name}</option>
      ))}
    </Field>
    <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
      <FaChevronDown className="text-light-green w-4 h-4" />
    </span>
    <ErrorMessage name="shiftType" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ Shift Category */}
  <div className="relative">
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Shift Category</label>
    <Field
      as="select"
      name="shiftCategory"
      className={`w-full border rounded-sm p-[10px] appearance-none pr-10
        ${touched.shiftCategory && errors.shiftCategory ? "border-red-500" : "border-light-gray"}
        ${values.shiftCategory ? "text-black" : "text-[#72787E] text-sm"}`}
    >
      <option value="" className="text-gray-400">Please select the shift category</option>
      {shiftCategories.map((item) => (
        <option key={item.id} value={item.id} className="text-black">{item.name}</option>
      ))}
    </Field>
    <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
      <FaChevronDown className="text-light-green w-4 h-4" />
    </span>
    <ErrorMessage name="shiftCategory" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ Client */}
  <div className="relative">
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Select Client</label>
    <Field
      as="select"
      name="client"
      className={`w-full border rounded-sm p-[10px] appearance-none pr-10
        ${touched.client && errors.client ? "border-red-500" : "border-light-gray"}
        ${values.client ? "text-black" : "text-[#72787E] text-sm"}`}
    >
      <option value="" className="text-gray-400">Please select a client</option>
      {clients.map((item) => (
        <option key={item.id} value={item.id} className="text-black">{item.name}</option>
      ))}
    </Field>
    <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
      <FaChevronDown className="text-light-green w-4 h-4" />
    </span>
    <ErrorMessage name="client" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ User */}
  <div className="relative">
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Select User</label>
    <Field
      as="select"
      name="user"
      className={`w-full border rounded-sm p-[10px] appearance-none pr-10
        ${touched.user && errors.user ? "border-red-500" : "border-light-gray"}
        ${values.user ? "text-black" : "text-[#72787E] text-sm"}`}
    >
      <option value="" className="text-gray-400">Please select a user</option>
      {users.map((item) => (
        <option key={item.id} value={item.id} className="text-black">{item.name}</option>
      ))}
    </Field>
    <span className="absolute right-3 top-12 -translate-y-1/2 pointer-events-none">
      <FaChevronDown className="text-light-green w-4 h-4" />
    </span>
    <ErrorMessage name="user" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ Start Date */}
  <div>
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Start Date</label>
    <Field
      name="startDate"
      type="date"
      className={`w-full border rounded-sm p-[10px]
        ${touched.startDate && errors.startDate ? "border-red-500" : "border-light-gray"}
        ${values.startDate ? "text-black" : "text-[#72787E] text-sm"}`}
    />
    <ErrorMessage name="startDate" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ End Date */}
  <div>
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">End Date</label>
    <Field
      name="endDate"
      type="date"
      className={`w-full border rounded-sm p-[10px]
        ${touched.endDate && errors.endDate ? "border-red-500" : "border-light-gray"}
        ${values.endDate ? "text-black" : "text-[#72787E] text-sm"}`}
    />
    <ErrorMessage name="endDate" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ Start Time */}
  <div>
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Start Time</label>
    <Field
      name="startTime"
      type="text"
      placeholder="HH:MM"
      className={`w-full border rounded-sm p-[10px] placeholder:text-sm
        ${touched.startTime && errors.startTime ? "border-red-500" : "border-light-gray"}`}
    />
    <ErrorMessage name="startTime" component="div" className="text-red-500 text-xs mt-1" />
  </div>

  {/* ✅ End Time */}
  <div>
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">End Time</label>
    <Field
      name="endTime"
      type="text"
      placeholder="HH:MM"
      className={`w-full border rounded-sm p-[10px] placeholder:text-sm
        ${touched.endTime && errors.endTime ? "border-red-500" : "border-light-gray"}`}
    />
    <ErrorMessage name="endTime" component="div" className="text-red-500 text-xs mt-1" />
  </div>
  {/* ✅ Access To Shift Report (Toggle) */}
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


  {/* ✅ Description */}
  <div className="col-span-2">
    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Description of Shift</label>
    <Field
      as="textarea"
      name="description"
      placeholder="Write the description of the Shift"
      className={`w-full border rounded-sm p-[10px] h-50 placeholder:text-sm
        ${touched.description && errors.description ? "border-red-500" : "border-light-gray"}`}
    />
    <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
  </div>

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
        onView={() => setSlider({ ...slider, show: false })}
        onDismiss={() => setSlider({ ...slider, show: false })}
      />
    </div>
  );
};

export default AddUserShift;
