import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
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
  medications: [
    {
      medicationName: "",
      dosage: "",
      timing: "",
      medicineDescription: "",
      reasonOfMedication: "",
      cautions: "",
    },
  ],
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
    dob: Yup.date().required("Date of Birth required"),
    description: Yup.string()
    // NEW: validate medications array

  });

  // ✅ Fetch client data for update mode
  useEffect(() => {
    const fetchClient = async () => {
      if (mode === "update" && id) {
        try {
         const clientSnap = await getDoc(doc(db, "clients", id));

          if (clientSnap.exists()) {
           const data = clientSnap.data();

            // If document already has medications array, use it.
            // Otherwise, build one item from legacy single fields.
            const existingMeds =
              data.medications && Array.isArray(data.medications)
                ? data.medications
                : [
                    {
                      medicationName: data.medicationName || "",
                      dosage: data.dosage || "",
                      medicineDescription: data.medicineDescription || "",
                      reasonOfMedication: data.reasonOfMedication || "",
                      cautions: data.cautions || "",
                    },
                  ];

           setInitialValues({
  name: data.name || "",
  clientCode: data.clientCode || "",
  clientStatus: data.clientStatus || "Active",
  parentEmail: data.parentEmail || "",
  agency: data.agencyName || "",
  address: data.address || "",
  dob: data.dob || "",
  kmRate: data.kmRate || "",
  clientRate: data.clientRate || "",
  description: data.description || "",
  avatar: null,

  medications:
    Array.isArray(data.medications) && data.medications.length > 0
      ? data.medications
      : [
          {
            medicationName: "",
            dosage: "",
            timing: "",
            medicineDescription: "",
            reasonOfMedication: "",
            cautions: "",
          },
        ],

  pharmacy: data.pharmacy || {
    pharmacyName: "",
    pharmacyEmail: "",
    pharmacyPhone: "",
    pharmacyAddress: "",
  },
});


            if (data.avatar) setAvatarPreview(data.avatar);
          } else {
            console.warn("No client found with ID:", id);
          }
        } catch (err) {
          console.error("Error fetching client:", err);
        }
      }
    };

    fetchClient();
  }, [mode, id]);

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

  const handleSubmit = async (values, { resetForm }) => {
    try {
      // Always define a customId
      let customId = Date.now().toString();

      let photoURL = avatarPreview;

      if (values.avatar) {
        const storageRef = ref(storage, `client-images/${values.avatar.name}`);
        await uploadBytes(storageRef, values.avatar);
        photoURL = await getDownloadURL(storageRef);
      }

      // NEW: medications array
      const medications = values.medications || [];

      // For backward compatibility:
      // also store the first medication as top-level fields
      const firstMed = medications[0] || {
        medicationName: "",
        dosage: "",
        medicineDescription: "",
        reasonOfMedication: "",
        cautions: "",
      };

      const dataToSave = {
        ...values,
        avatar: photoURL || "",
        medications,
        // legacy fields – in case something else in the app still reads them
       
        
      };

      if (mode === "update" && id) {
        // Fetch the existing client
       const clientSnap = await getDoc(doc(db, "clients", id));

        if (clientSnap.exists()) {
         const data = clientSnap.data();

          // Use the existing document ID as customId
          // customId = clientDoc.id;

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
        } else {
          setSlider({
            show: true,
            title: "Client Not Found!",
            subtitle: "",
            viewText: "",
          });
        }
      } else {
        // ADD MODE – use the generated customId
        await setDoc(doc(db, "clients", customId), {
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
      }

      // Fetch admins
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminsSnapshot = await getDocs(q);
      const admins = adminsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
          senderId: user.name,
          meta: {
            clientId: customId,
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
        validationSchema={mode === "add" ? validationSchema : validationSchema}
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
                  <img src="/images/profile.jpeg" />
                )}
              </div>

              <div className="flex gap-3">
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    handleAvatarChange(event, setFieldValue)
                  }
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
                    ${
                      values.clientStatus === ""
                        ? "text-[#72787E] font-normal text-sm"
                        : "text-light-black"
                    }
                    ${
                      touched.clientStatus && errors.clientStatus
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
              <FieldInput
                label="Address"
                name="address"
                placeholder="Please enter the address"
                touched={touched}
                errors={errors}
              />
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

              {/* =================== PHARMACY INFORMATION =================== */}
<div className="col-span-2  rounded-sm p-1 bg-white">
  <p className="font-bold text-2xl mb-3 leading-7 text-light-black">Pharmacy Information</p>

  <div className="grid grid-cols-2 gap-x-8 gap-y-4  border border-light-gray p-4">
    <FieldInput
      label="Pharmacy Name"
      name="pharmacy.pharmacyName"
      placeholder="Enter pharmacy name"
      touched={touched.pharmacy || {}}
      errors={errors.pharmacy || {}}
    />

    <FieldInput
      label="Pharmacy Email"
      name="pharmacy.pharmacyEmail"
      placeholder="Enter pharmacy email"
      touched={touched.pharmacy || {}}
      errors={errors.pharmacy || {}}
      type="email"
    />

    <FieldInput
      label="Pharmacy Phone"
      name="pharmacy.pharmacyPhone"
      placeholder="Enter phone number"
      touched={touched.pharmacy || {}}
      errors={errors.pharmacy || {}}
    />

    <FieldInput
      label="Pharmacy Address"
      name="pharmacy.pharmacyAddress"
      placeholder="Enter address"
      touched={touched.pharmacy || {}}
      errors={errors.pharmacy || {}}
    />
  </div>
</div>


              {/* =================== MEDICATIONS BLOCK (MULTIPLE) =================== */}
              <FieldArray name="medications">
                {(arrayHelpers) => (
                  <>
                    <div className="col-span-2 flex  justify-between ">
                      <div className="font-bold text-2xl leading-7">
                        Medications Information
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          arrayHelpers.push({
                            medicationName: "",
                            dosage: "",
                            medicineDescription: "",
                            reasonOfMedication: "",
                            cautions: "",
                          })
                        }
                        className="text-sm font-medium px-3 py-1 border border-dark-green text-dark-green rounded-sm hover:bg-dark-green hover:text-white transition"
                      >
                        + Add Medicine
                      </button>
                    </div>

                    {values.medications &&
                      values.medications.map((med, index) => (
                        <div
                          key={index}
                          className="col-span-2 border border-light-gray rounded-sm p-4 "
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
                            {/* Name & Dosage */}
                            <div>
                              <label className="font-bold text-sm">
                                Name of Medication
                              </label>
                              <Field
                                name={`medications[${index}].medicationName`}
                                placeholder="Enter medicine name"
                                className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                                  touched.medications &&
                                  touched.medications[index] &&
                                  errors.medications &&
                                  errors.medications[index] &&
                                  errors.medications[index].medicationName
                                    ? "border-red-500"
                                    : "border-light-gray"
                                }`}
                              />
                              <ErrorMessage
                                name={`medications[${index}].medicationName`}
                                component="div"
                                className="text-red-500 text-xs mt-1"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm">
                                Dosage
                              </label>
                              <Field
                                name={`medications[${index}].dosage`}
                                placeholder="Enter dosage"
                                className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                                  touched.medications &&
                                  touched.medications[index] &&
                                  errors.medications &&
                                  errors.medications[index] &&
                                  errors.medications[index].dosage
                                    ? "border-red-500"
                                    : "border-light-gray"
                                }`}
                              />
                              <ErrorMessage
                                name={`medications[${index}].dosage`}
                                component="div"
                                className="text-red-500 text-xs mt-1"
                              />
                            </div>

                            <div>
                                <label className="font-bold text-sm">Timing</label>
                                <Field
                                  name={`medications[${index}].timing`}
                                  placeholder="e.g. Morning and Evening"
                                  className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                                    touched.medications &&
                                    touched.medications[index] &&
                                    errors.medications &&
                                    errors.medications[index] &&
                                    errors.medications[index].timing
                                      ? "border-red-500"
                                      : "border-light-gray"
                                  }`}
                                />
                                <ErrorMessage
                                  name={`medications[${index}].timing`}
                                  component="div"
                                  className="text-red-500 text-xs mt-1"
                                />
                              </div>

                            {/* Description */}
                            <div className="col-span-2">
                              <label className="font-bold text-sm">
                                Description of Medicine
                              </label>
                              <Field
                                as="textarea"
                                name={`medications[${index}].medicineDescription`}
                                placeholder="Describe the medicine"
                                className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                                  touched.medications &&
                                  touched.medications[index] &&
                                  errors.medications &&
                                  errors.medications[index] &&
                                  errors.medications[index].medicineDescription
                                    ? "border-red-500"
                                    : "border-light-gray"
                                }`}
                              />
                              <ErrorMessage
                                name={`medications[${index}].medicineDescription`}
                                component="div"
                                className="text-red-500 text-xs mt-1"
                              />
                            </div>

                            {/* Reason */}
                            <div className="col-span-2">
                              <label className="font-bold text-sm">
                                Reason of Medication
                              </label>
                              <Field
                                as="textarea"
                                name={`medications[${index}].reasonOfMedication`}
                                placeholder="Write the reason for medication"
                                className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                                  touched.medications &&
                                  touched.medications[index] &&
                                  errors.medications &&
                                  errors.medications[index] &&
                                  errors.medications[index].reasonOfMedication
                                    ? "border-red-500"
                                    : "border-light-gray"
                                }`}
                              />
                              <ErrorMessage
                                name={`medications[${index}].reasonOfMedication`}
                                component="div"
                                className="text-red-500 text-xs mt-1"
                              />
                            </div>

                            {/* Cautions */}
                            <div className="col-span-2">
                              <label className="font-bold text-sm">
                                Cautions
                              </label>
                              <Field
                                as="textarea"
                                name={`medications[${index}].cautions`}
                                placeholder="Write any cautions"
                                className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                                  touched.medications &&
                                  touched.medications[index] &&
                                  errors.medications &&
                                  errors.medications[index] &&
                                  errors.medications[index].cautions
                                    ? "border-red-500"
                                    : "border-light-gray"
                                }`}
                              />
                              <ErrorMessage
                                name={`medications[${index}].cautions`}
                                component="div"
                                className="text-red-500 text-xs mt-1"
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
          navigate("/admin-dashboard/clients")
          setSlider({ ...slider, show: false });
        }}
        onDismiss={() => setSlider({ ...slider, show: false })}
      />
    </div>
  );
};

// ✅ Helper Input Components
const FieldInput = ({
  label,
  name,
  placeholder,
  touched,
  errors,
  type = "text",
}) => (
  <div>
    <label className="font-bold text-sm">{label}</label>
    <Field
      name={name}
      type={type}
      placeholder={placeholder}
      className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
        touched[name] && errors[name] ? "border-red-500" : "border-light-gray"
      }`}
    />
    <ErrorMessage
      name={name}
      component="div"
      className="text-red-500 text-xs mt-1"
    />
  </div>
);

const FieldTextArea = ({
  label,
  name,
  placeholder,
  touched,
  errors,
}) => (
  <div className="col-span-2">
    <label className="font-bold text-sm">{label}</label>
    <Field
      as="textarea"
      name={name}
      placeholder={placeholder}
      className={`w-full border rounded-sm p-[10px] h-40 placeholder:text-sm placeholder:text-[#72787E] ${
        touched[name] && errors[name] ? "border-red-500" : "border-light-gray"
      }`}
    />
    <ErrorMessage
      name={name}
      component="div"
      className="text-red-500 text-xs mt-1"
    />
  </div>
);

export default AddClient;
