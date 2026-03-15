import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray, getIn } from "formik";
import * as Yup from "yup";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { FaChevronDown } from "react-icons/fa6";
import SuccessSlider from "../components/SuccessSlider";
import { useNavigate, useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import GoogleAddressInput from "../components/GoogleAddressInput";
import { CustomTimePicker } from "./CustomTimePicker";

const emptyMedication = {
  medicationName: "",
  dosage: "",
  timing: "",
  medicineDescription: "",
  reasonOfMedication: "",
  cautions: "",
};

const emptyShiftPoint = {
  name: "",
  seatType: "Forward Facing Seat",
  gender: "Male",
  dob: "",
  cyimId: "",
  pickupDate: "",
  pickupTime: "",
  dropDate: "",
  dropTime: "",
  visitDate: "",
  visitStartTime: "",
  visitEndTime: "",
  visitDuration: "",
  visitLocation: "",
  pickupLocation: "",
  dropLocation: "",
};

const AddClient = ({ mode = "add", user }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",
    viewText: "View Client",
  });

  const [createdClient, setCreatedClient] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // UI state for Shift Points accordion (open/close)
  const [openShiftPoints, setOpenShiftPoints] = useState({}); // { [index]: true/false }
  const [refreshKey, setRefreshKey] = useState(0);

  const [initialValues, setInitialValues] = useState({
    name: "",
    clientCode: "",
    password: "",
    clientStatus: "",
    parentEmail: "",
    agency: "",
    address: "",
    dob: "",
    kmRate: "",
    clientRate: "",
    description: "",
    avatar: null,

    // ✅ NEW: Shift Points array
    shiftPoints: [],

    medications: [emptyMedication],
    pharmacy: {
      pharmacyName: "",
      pharmacyEmail: "",
      pharmacyPhone: "",
      pharmacyAddress: "",
    },
  });

  // ✅ Validation Schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required").min(3, "Min 3 chars"),
    clientCode: Yup.string()
      .required("Client Code is required")
      .matches(/^[A-Za-z0-9]+$/, "Only alphanumeric allowed"),
    clientStatus: Yup.string().required("Select client status"),
    parentEmail: Yup.string()
      .required("Parent email is required")
      .email("Invalid email"),
    agency: Yup.string().required("Agency required"),
    address: Yup.string().required("Address required"),
    dob: Yup.string().required("Date of Birth required"),
    kmRate: Yup.string(),
    clientRate: Yup.string(),
    description: Yup.string(),

    // ✅ Medications (basic validation; you can tighten later)
    medications: Yup.array()
      .of(
        Yup.object({
          medicationName: Yup.string(),
          dosage: Yup.string(),
          timing: Yup.string(),
          medicineDescription: Yup.string(),
          reasonOfMedication: Yup.string(),
          cautions: Yup.string(),
        })
      )
      .min(1, "At least one medication item is required"),

    // ✅ Shift Points (optional; validate name if a shift point exists)
    shiftPoints: Yup.array().of(
      Yup.object({
        name: Yup.string().required("Name is required"),
        seatType: Yup.string(),
        gender: Yup.string(),
        dob: Yup.string(),
        cyimId: Yup.string(),
        pickupDate: Yup.string(),
        pickupTime: Yup.string(),
        dropDate: Yup.string(),
        dropTime: Yup.string(),
        visitDate: Yup.string(),
        visitStartTime: Yup.string(),
        visitEndTime: Yup.string(),
        visitDuration: Yup.string(),
        visitLocation: Yup.string(),
        pickupLocation: Yup.string(),
        dropLocation: Yup.string(),
      })
    ),
  });

  // ✅ Fetch client data for update mode
  useEffect(() => {
    const fetchClient = async () => {
      if (mode === "update" && id) {
        try {
          const clientSnap = await getDoc(doc(db, "clients", id));

          if (clientSnap.exists()) {
            const data = clientSnap.data();

            setInitialValues({
              name: data.name || "",
              clientCode: data.clientCode || "",
              password: data.password || "",
              clientStatus: data.clientStatus || "Active",
              parentEmail: data.parentEmail || "",
              agency: data.agencyName || data.agency || "",
              address: data.address || "",
              dob: data.dob || "",
              kmRate: data.kmRate || "",
              clientRate: data.clientRate || "",
              description: data.description || "",
              avatar: null,

              // ✅ NEW: shiftPoints (from Firestore)
              shiftPoints: Array.isArray(data.shiftPoints) ? data.shiftPoints : [],

              medications:
                Array.isArray(data.medications) && data.medications.length > 0
                  ? data.medications
                  : [emptyMedication],

              pharmacy: data.pharmacy || {
                pharmacyName: "",
                pharmacyEmail: "",
                pharmacyPhone: "",
                pharmacyAddress: "",
              },
            });

            if (data.avatar) setAvatarPreview(data.avatar);

            // Open first shift point if exists
            if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
              setOpenShiftPoints({ 0: true });
            } else {
              setOpenShiftPoints({});
            }
          } else {
            console.warn("No client found with ID:", id);
          }
        } catch (err) {
          console.error("Error fetching client:", err);
        }
      }
    };

    fetchClient();
  }, [mode, id, refreshKey]);

  // ✅ Avatar Handlers
  const handleAvatarChange = (event, setFieldValue) => {
    const file = event.target.files[0];
    if (file) {
      setFieldValue("avatar", file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = (setFieldValue) => {
    setFieldValue("avatar", null);
    setAvatarPreview(null);
  };

  const toggleShiftPoint = (idx) => {
    setOpenShiftPoints((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmit = async (values, { resetForm }) => {
    try {
      // ✅ Use existing id in update mode, otherwise create new doc id
      const docId = mode === "update" && id ? id : Date.now().toString();

      let photoURL = avatarPreview;

      if (values.avatar) {
        const storageRef = ref(storage, `client-images/${docId}-${values.avatar.name}`);
        await uploadBytes(storageRef, values.avatar);
        photoURL = await getDownloadURL(storageRef);
      }

      const dataToSave = {
        ...values,
        avatar: photoURL || "",
        // ✅ ensure arrays exist
        medications: values.medications || [],
        shiftPoints: values.shiftPoints || [],
      };

      if (mode === "update" && id) {
        const clientSnap = await getDoc(doc(db, "clients", id));

        if (clientSnap.exists()) {
          await updateDoc(doc(db, "clients", id), {
            ...dataToSave,
            updatedAt: new Date(),
          });

          setSlider({
            show: true,
            title: "Client Updated Successfully!",
            subtitle: `${values.name} (${values.clientCode})`,
            viewText: "View Client",
          });

          setCreatedClient(dataToSave);

          // Re-fetch updated data so form shows current values
          setRefreshKey((k) => k + 1);
        } else {
          setSlider({
            show: true,
            title: "Client Not Found!",
            subtitle: "",
            viewText: "",
          });
        }
      } else {
        await setDoc(doc(db, "clients", docId), {
          ...dataToSave,
          createdAt: new Date(),
          fileClosed: false,
        });

        setSlider({
          show: true,
          title: "Client Added Successfully!",
          subtitle: `${values.name} (${values.clientCode})`,
          viewText: "View Client",
        });

        setCreatedClient(dataToSave);
        resetForm();
        setAvatarPreview(null);
        setOpenShiftPoints({});
      }

      // Fetch admins
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminsSnapshot = await getDocs(q);
      const admins = adminsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Send notification with correct clientId
      for (const admin of admins) {
        await sendNotification(admin.id, {
          type: "info",
          title: mode === "add" ? "New Client Created" : "Client Updated",
          message:
            mode === "add"
              ? `A new Client "${values.name}" has been added.`
              : `Client "${values.name}" has been updated.`,
          senderId: user?.name || "System",
          meta: {
            clientId: docId,
            clientName: values.name,
            entity: "Client",
          },
        });
      }
    } catch (error) {
      console.error("❌ Error saving client:", error);
      setSlider({
        show: true,
        title: "Error Saving Client!",
        subtitle: "Please try again.",
        viewText: "",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-bold text-2xl leading-7 text-light-black">
          {mode === "update" ? "Update Client" : "Add Client"}
        </p>
      </div>
      <hr className="border-t border-gray" />

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values, setFieldValue }) => (
          <Form className="flex flex-col gap-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-4 bg-white border border-light-gray rounded-sm">
              <div className="flex bg-gray-200 h-[90px] w-[90px] rounded-full overflow-hidden items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img src="/images/profile.jpeg" alt="Default Avatar" />
                )}
              </div>

              <div className="flex gap-3">
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleAvatarChange(event, setFieldValue)}
                />
                <label
                  htmlFor="avatarInput"
                  className="text-light-green px-3 py-[6px] rounded-sm border-2 border-dark-green font-medium text-sm cursor-pointer bg-dark-green text-white"
                >
                  Change Avatar
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveAvatar(setFieldValue)}
                  className="text-light-green px-3 py-[6px] rounded-sm border-2 border-light-green font-medium text-sm"
                >
                  Remove Avatar
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4 text-light-black">
              {/* Basic Info */}
              <FieldInput
                label="Name"
                name="name"
                placeholder="Please enter the name of user"
                touched={touched}
                errors={errors}
              />
              <FieldInput
                label="CYIM ID"
                name="clientCode"
                placeholder="Please enter a specific ID"
                touched={touched}
                errors={errors}
              />

              {/* Client Status */}
              <div className="relative">
                <label className="font-bold text-sm">Client Status</label>
                <Field
                  as="select"
                  name="clientStatus"
                  className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                    ${values.clientStatus === ""
                      ? "text-[#72787E] font-normal text-sm"
                      : "text-light-black"
                    }
                    ${getIn(touched, "clientStatus") && getIn(errors, "clientStatus")
                      ? "border-red-500"
                      : "border-light-gray"
                    }`}
                >
                  <option value="">Please select the client status</option>
                  <option value="Active">Active</option>
                  <option value="InActive">InActive</option>
                </Field>
                <span className="absolute right-3 top-[64%] -translate-y-1/2 pointer-events-none">
                  <FaChevronDown className="text-light-green w-4 h-4" />
                </span>
                <ErrorMessage
                  name="clientStatus"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              <FieldInput
                label="Parent E-Mail"
                name="parentEmail"
                placeholder="Please enter the e-mail ID"
                touched={touched}
                errors={errors}
                type="email"
              />
              <FieldInput
                label="Agency"
                name="agency"
                placeholder="Please enter the agency name"
                touched={touched}
                errors={errors}
              />
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Address</label>
                <GoogleAddressInput
                  value={values.address}
                  onSelect={(addr) => setFieldValue("address", addr)}
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.address && errors.address ? "border-red-500" : "border-light-gray"}`}
                  placeholder="Please enter the address"
                />
                <ErrorMessage name="address" component="div" className="text-red-500 text-xs mt-1" />
              </div>
              <FieldInput
                label="Date of Birth"
                name="dob"
                type="date"
                touched={touched}
                errors={errors}
              />
              <FieldInput
                label="Client KM Rate"
                name="kmRate"
                placeholder="Please enter the KM Rate"
                touched={touched}
                errors={errors}
              />
              <FieldInput
                label="Client Rate"
                name="clientRate"
                placeholder="Please enter the Rate"
                touched={touched}
                errors={errors}
              />

              {/* Description */}
              <FieldTextArea
                label="Description of Client"
                name="description"
                placeholder="Write the description of the User"
                touched={touched}
                errors={errors}
              />

              {/* =================== SHIFT POINTS (BEFORE PHARMACY) =================== */}
              <FieldArray name="shiftPoints">
                {(arrayHelpers) => (
                  <div className="col-span-2 rounded-sm p-1 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-2xl leading-7 text-light-black">
                        Shift Points
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          const nextIndex = values.shiftPoints?.length || 0;
                          arrayHelpers.push({ ...emptyShiftPoint });
                          setOpenShiftPoints((prev) => ({ ...prev, [nextIndex]: true }));
                        }}
                        className="text-sm font-medium px-3 py-2 border border-dark-green text-dark-green rounded-sm hover:bg-dark-green hover:text-white transition"
                      >
                        + Add Shift Points
                      </button>
                    </div>

                    {(!values.shiftPoints || values.shiftPoints.length === 0) && (
                      <div className="border border-light-gray rounded-sm p-4 text-sm text-[#72787E]">
                        No shift points added yet. Click <b>+ Add Shift Points</b> to add one.
                      </div>
                    )}

                    {values.shiftPoints &&
                      values.shiftPoints.map((sp, index) => {
                        const isOpen = !!openShiftPoints[index];
                        const headerTitle =
                          sp?.name?.trim()
                            ? sp.name
                            : `Shift Point #${index + 1}`;

                        return (
                          <div
                            key={index}
                            className="border border-light-gray rounded-sm p-4 mb-4"
                          >
                            {/* Header Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <p className="font-semibold text-base text-light-black">
                                  {headerTitle}
                                </p>
                                <p className="text-xs text-[#72787E] mt-1">
                                  {sp?.pickupDate ? `Pickup: ${sp.pickupDate}` : ""}
                                  {sp?.dropDate ? ` • Drop: ${sp.dropDate}` : ""}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleShiftPoint(index)}
                                  className="text-xs font-medium px-3 py-2 border border-dark-green text-dark-green rounded-sm hover:bg-dark-green hover:text-white transition"
                                >
                                  {isOpen ? "Close" : "Edit"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    arrayHelpers.remove(index);

                                    // reset open state to avoid index mismatch after delete
                                    const next = {};
                                    const nextLen = (values.shiftPoints?.length || 0) - 1;
                                    if (nextLen > 0) next[0] = true;
                                    setOpenShiftPoints(next);
                                  }}
                                  className="text-xs font-medium px-3 py-2 border border-red-500 text-red-600 rounded-sm hover:bg-red-600 hover:text-white transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Body */}
                            {isOpen && (
                              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4">
                                <FieldInput
                                  label="Name"
                                  name={`shiftPoints[${index}].name`}
                                  placeholder="Enter name"
                                  touched={touched}
                                  errors={errors}
                                />

                                {/* Seat Type */}
                                <div className="relative">
                                  <label className="font-bold text-sm">Seat Type</label>
                                  <Field
                                    as="select"
                                    name={`shiftPoints[${index}].seatType`}
                                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                                      ${getIn(touched, `shiftPoints[${index}].seatType`) &&
                                        getIn(errors, `shiftPoints[${index}].seatType`)
                                        ? "border-red-500"
                                        : "border-light-gray"
                                      }`}
                                  >
                                    <option value="Forward Facing Seat">Forward Facing Seat</option>
                                    <option value="Rear Facing Seat">Rear Facing Seat</option>
                                    <option value="Booster Seat">Booster Seat</option>
                                    <option value="No Seat Required">No Seat Required</option>
                                  </Field>
                                  <span className="absolute right-3 top-[64%] -translate-y-1/2 pointer-events-none">
                                    <FaChevronDown className="text-light-green w-4 h-4" />
                                  </span>
                                  <ErrorMessage
                                    name={`shiftPoints[${index}].seatType`}
                                    component="div"
                                    className="text-red-500 text-xs mt-1"
                                  />
                                </div>

                                {/* Gender */}
                                <div className="relative">
                                  <label className="font-bold text-sm">Gender</label>
                                  <Field
                                    as="select"
                                    name={`shiftPoints[${index}].gender`}
                                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                                      ${getIn(touched, `shiftPoints[${index}].gender`) &&
                                        getIn(errors, `shiftPoints[${index}].gender`)
                                        ? "border-red-500"
                                        : "border-light-gray"
                                      }`}
                                  >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </Field>
                                  <span className="absolute right-3 top-[64%] -translate-y-1/2 pointer-events-none">
                                    <FaChevronDown className="text-light-green w-4 h-4" />
                                  </span>
                                  <ErrorMessage
                                    name={`shiftPoints[${index}].gender`}
                                    component="div"
                                    className="text-red-500 text-xs mt-1"
                                  />
                                </div>

                                <FieldInput
                                  label="Date of Birth"
                                  name={`shiftPoints[${index}].dob`}
                                  type="date"
                                  touched={touched}
                                  errors={errors}
                                />

                                <FieldInput
                                  label="CYIM ID"
                                  name={`shiftPoints[${index}].cyimId`}
                                  placeholder="Enter CYIM ID"
                                  touched={touched}
                                  errors={errors}
                                />

                                <FieldInput
                                  label="Pickup Date"
                                  name={`shiftPoints[${index}].pickupDate`}
                                  type="date"
                                  touched={touched}
                                  errors={errors}
                                />
                                <FieldInput
                                  label="Pickup Time"
                                  name={`shiftPoints[${index}].pickupTime`}
                                  type="time"
                                  touched={touched}
                                  errors={errors}
                                />

                                <FieldInput
                                  label="Drop Date"
                                  name={`shiftPoints[${index}].dropDate`}
                                  type="date"
                                  touched={touched}
                                  errors={errors}
                                />
                                <FieldInput
                                  label="Drop Time"
                                  name={`shiftPoints[${index}].dropTime`}
                                  type="time"
                                  touched={touched}
                                  errors={errors}
                                />

                                <FieldInput
                                  label="Visit Date"
                                  name={`shiftPoints[${index}].visitDate`}
                                  type="date"
                                  touched={touched}
                                  errors={errors}
                                />
                                <FieldInput
                                  label="Visit Start Time"
                                  name={`shiftPoints[${index}].visitStartTime`}
                                  type="time"
                                  touched={touched}
                                  errors={errors}
                                />

                                <FieldInput
                                  label="Visit End Time"
                                  name={`shiftPoints[${index}].visitEndTime`}
                                  type="time"
                                  touched={touched}
                                  errors={errors}
                                />
                                <FieldInput
                                  label="Visit Duration"
                                  name={`shiftPoints[${index}].visitDuration`}
                                  placeholder="e.g. 2 hours"
                                  touched={touched}
                                  errors={errors}
                                />

                                <div className="col-span-2">
                                  <FieldTextArea
                                    label="Visit Location"
                                    name={`shiftPoints[${index}].visitLocation`}
                                    placeholder="Enter visit location"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>

                                <div className="col-span-2">
                                  <FieldTextArea
                                    label="Pickup Location"
                                    name={`shiftPoints[${index}].pickupLocation`}
                                    placeholder="Enter pickup location"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>

                                <div className="col-span-2">
                                  <FieldTextArea
                                    label="Drop Location"
                                    name={`shiftPoints[${index}].dropLocation`}
                                    placeholder="Enter drop location"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>

                                {/* Optional: quick collapse button */}
                                <div className="col-span-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => toggleShiftPoint(index)}
                                    className="text-xs font-medium px-3 py-2 border border-dark-green text-dark-green rounded-sm hover:bg-dark-green hover:text-white transition"
                                  >
                                    Save & Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </FieldArray>

              {/* =================== PHARMACY INFORMATION =================== */}
              <div className="col-span-2 rounded-sm p-1 bg-white">
                <p className="font-bold text-2xl mb-3 leading-7 text-light-black">
                  Pharmacy Information
                </p>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 border border-light-gray p-4">
                  <FieldInput
                    label="Pharmacy Name"
                    name="pharmacy.pharmacyName"
                    placeholder="Enter pharmacy name"
                    touched={touched}
                    errors={errors}
                  />

                  <FieldInput
                    label="Pharmacy Email"
                    name="pharmacy.pharmacyEmail"
                    placeholder="Enter pharmacy email"
                    touched={touched}
                    errors={errors}
                    type="email"
                  />

                  <FieldInput
                    label="Pharmacy Phone"
                    name="pharmacy.pharmacyPhone"
                    placeholder="Enter phone number"
                    touched={touched}
                    errors={errors}
                  />

                  <FieldInput
                    label="Pharmacy Address"
                    name="pharmacy.pharmacyAddress"
                    placeholder="Enter address"
                    touched={touched}
                    errors={errors}
                  />
                </div>
              </div>

              {/* =================== MEDICATIONS BLOCK (MULTIPLE) =================== */}
              <FieldArray name="medications">
                {(arrayHelpers) => (
                  <>
                    <div className="col-span-2 flex justify-between">
                      <div className="font-bold text-2xl leading-7">
                        Medications Information
                      </div>
                      <button
                        type="button"
                        onClick={() => arrayHelpers.push({ ...emptyMedication })}
                        className="text-sm font-medium px-3 py-1 border border-dark-green text-dark-green rounded-sm hover:bg-dark-green hover:text-white transition"
                      >
                        + Add Medicine
                      </button>
                    </div>

                    {values.medications &&
                      values.medications.map((med, index) => (
                        <div
                          key={index}
                          className="col-span-2 border border-light-gray rounded-sm p-4"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-semibold text-base">
                              Medication #{index + 1}
                            </p>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => arrayHelpers.remove(index)}
                                className="text-xs text-red-600 border border-red-500 px-2 py-1 rounded-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <FieldInput
                              label="Name of Medication"
                              name={`medications[${index}].medicationName`}
                              placeholder="Enter medicine name"
                              touched={touched}
                              errors={errors}
                            />

                            <FieldInput
                              label="Dosage"
                              name={`medications[${index}].dosage`}
                              placeholder="Enter dosage"
                              touched={touched}
                              errors={errors}
                            />

                            <FieldInput
                              label="Timing"
                              name={`medications[${index}].timing`}
                              placeholder="e.g. Morning and Evening"
                              touched={touched}
                              errors={errors}
                            />

                            <div className="col-span-2">
                              <FieldTextArea
                                label="Description of Medicine"
                                name={`medications[${index}].medicineDescription`}
                                placeholder="Describe the medicine"
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-span-2">
                              <FieldTextArea
                                label="Reason of Medication"
                                name={`medications[${index}].reasonOfMedication`}
                                placeholder="Write the reason for medication"
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-span-2">
                              <FieldTextArea
                                label="Cautions"
                                name={`medications[${index}].cautions`}
                                placeholder="Write any cautions"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </FieldArray>

              {/* Submit Button */}
              <div className="col-span-2 flex justify-center mt-4">
                <button
                  type="submit"
                  className="bg-dark-green text-white px-6 py-2 rounded cursor-pointer"
                >
                  {mode === "update" ? "Update Client" : "Add Client"}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>

      {/* Success Slider */}
      <SuccessSlider
        show={slider.show}
        title={slider.title}
        subtitle={slider.subtitle}
        viewText={slider.viewText}
        onView={() => {
          if (createdClient) setInitialValues(createdClient);
          navigate("/admin-dashboard/clients");
          setSlider((prev) => ({ ...prev, show: false }));
        }}
        onDismiss={() => setSlider((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
};

// ✅ Helper Input Components (supports nested paths using getIn)
const FieldInput = ({
  label,
  name,
  placeholder,
  touched,
  errors,
  type = "text",
}) => {
  const isTouched = !!getIn(touched, name);
  const err = getIn(errors, name);

  return (
    <div>
      <label className="font-bold text-sm">{label}</label>
      {type === "time" ? (
        <Field name={name}>
          {({ field, form }) => (
            <CustomTimePicker
              value={field.value || ""}
              onChange={(val) => form.setFieldValue(name, val)}
              className={isTouched && err ? "border-red-500" : "border-light-gray"}
            />
          )}
        </Field>
      ) : (
        <Field
          name={name}
          type={type}
          placeholder={placeholder}
          className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${isTouched && err ? "border-red-500" : "border-light-gray"
            }`}
        />
      )}
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-xs mt-1"
      />
    </div>
  );
};

const FieldTextArea = ({ label, name, placeholder, touched, errors }) => {
  const isTouched = !!getIn(touched, name);
  const err = getIn(errors, name);

  return (
    <div className="col-span-2">
      <label className="font-bold text-sm">{label}</label>
      <Field
        as="textarea"
        name={name}
        placeholder={placeholder}
        className={`w-full border rounded-sm p-[10px] h-32 placeholder:text-sm placeholder:text-[#72787E] ${isTouched && err ? "border-red-500" : "border-light-gray"
          }`}
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-xs mt-1"
      />
    </div>
  );
};

export default AddClient;
