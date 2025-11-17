import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { FaRegUserCircle } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa6";
import SuccessSlider from "../components/SuccessSlider";
import { useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";

const AddClient = ({  mode = "add", user }) => {
  const{id}=useParams();

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
    description: "",
    avatar: null,
    medicationName: "",
    dosage: "",
    medicineDescription: "",
    reasonOfMedication: "",
    cautions: "",
  });

  // ✅ Validation Schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required").min(3, "Min 3 chars"),
    clientCode: Yup.string()
      .required("Client Code is required")
      .matches(/^[A-Za-z0-9]+$/, "Only alphanumeric allowed"),
    clientStatus: Yup.string().required("Select client status"),
    parentEmail: Yup.string().required("Parent email is required").email("Invalid email"),
    agency: Yup.string().required("Agency required"),
    address: Yup.string().required("Address required"),
    dob: Yup.date().required("Date of Birth required"),
    description: Yup.string().max(200, "Max 200 chars"),
    medicationName: Yup.string().required("Medication name is required"),
    dosage: Yup.string().required("Dosage is required"),
    medicineDescription: Yup.string().max(200, "Max 200 chars"),
    reasonOfMedication: Yup.string().max(200, "Max 200 chars"),
    cautions: Yup.string().max(200, "Max 200 chars"),
  });

  // ✅ Fetch client data for update mode
  useEffect(() => {
    const fetchClient = async () => {
      if (mode === "update" && id) {
        try {
          const q = query(collection(db, "clients"), where("id", "==", id));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const clientDoc = querySnapshot.docs[0];
            const data = clientDoc.data();

            setInitialValues({
              name: data.name || "",
              clientCode: data.clientCode || "",
              clientStatus: data.clientStatus || "",
              parentEmail: data.email || "",
              agency: data.agencyName || "",
              address: data.address || "",
              dob: data.dob || "",
              description: data.description || "",
              avatar: null,
              medicationName: data.medicationName || "",
              dosage: data.dosage || "",
              medicineDescription: data.medicineDescription || "",
              reasonOfMedication: data.reasonOfMedication || "",
              cautions: data.cautions || "",
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

    const dataToSave = {
      ...values,
      avatar: photoURL || "",
      
    };

    if (mode === "update" && id) {
      // Fetch the existing client
      const q = query(collection(db, "clients"), where("id", "==", id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const clientDoc = querySnapshot.docs[0];

        // Use the existing document ID as customId
        customId = clientDoc.id;

        await updateDoc(doc(db, "clients", customId), {
        ...dataToSave,
         updatedAt: new Date(),});

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
      await setDoc(doc(db, "dev_clients", customId), {
        ...dataToSave,
        createdAt: new Date(),
        fileClosed:false,
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
    const admins = adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
          entity:"Client"
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
        validationSchema={mode === "add" ? validationSchema : null}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values, setFieldValue }) => (
          <Form className="flex flex-col gap-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-4 bg-white border border-light-gray rounded-sm">
              <div className="flex bg-gray-200 h-[90px] w-[90px] rounded-full overflow-hidden items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
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
              <FieldInput label="Name" name="name" placeholder="Please enter the name of user" touched={touched} errors={errors}  />
              <FieldInput label="CYIM ID" name="clientCode" placeholder="Please enter a specific ID" touched={touched} errors={errors} />
              
              {/* Client Status */}
              <div className="relative">
                <label className="font-bold text-sm">Client Status</label>
                <Field
                  as="select"
                  name="clientStatus"
                  className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                    ${values.clientStatus === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"}
                    ${touched.clientStatus && errors.clientStatus ? "border-red-500" : "border-light-gray"}`}
                >
                  <option value="">Please select the client status</option>
                  <option value="Active">Active</option>
                  <option value="InActive">InActive</option>
                </Field>
                <span className="absolute right-3 top-[64%] -translate-y-1/2 pointer-events-none">
                  <FaChevronDown className="text-light-green w-4 h-4" />
                </span>
                <ErrorMessage name="clientStatus" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              <FieldInput label="Parent E-Mail" name="parentEmail" placeholder="Please enter the e-mail ID" touched={touched} errors={errors} type="email" />
              <FieldInput label="Agency" name="agency" placeholder="Please enter the agency name" touched={touched} errors={errors} />
              <FieldInput label="Address" name="address" placeholder="Please enter the address" touched={touched} errors={errors} />
              <FieldInput label="Date of Birth" name="dob" type="date" touched={touched} errors={errors} />

              {/* Description */}
              <FieldTextArea label="Description of Client" name="description" placeholder="Write the description of the User" touched={touched} errors={errors} />

              <div className="col-span-2 font-bold text-2xl leading-7">Medications Information</div>
              <FieldInput label="Name of Medication" name="medicationName" placeholder="Enter medicine name" touched={touched} errors={errors} />
              <FieldInput label="Dosage" name="dosage" placeholder="Enter dosage" touched={touched} errors={errors} />
              <FieldTextArea label="Description of Medicine" name="medicineDescription" placeholder="Describe the medicine" touched={touched} errors={errors} />
              <FieldTextArea label="Reason of Medication" name="reasonOfMedication" placeholder="Write the reason for medication" touched={touched} errors={errors} />
              <FieldTextArea label="Cautions" name="cautions" placeholder="Write any cautions" touched={touched} errors={errors} />

              <div className="col-span-2 flex justify-center">
                <button type="submit" className="bg-dark-green text-white px-6 py-2 rounded">
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
          setSlider({ ...slider, show: false });
        }}
        onDismiss={() => setSlider({ ...slider, show: false })}
      />
    </div>
  );
};

// ✅ Helper Input Components
const FieldInput = ({ label, name, placeholder, touched, errors, type = "text" }) => (
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
    <ErrorMessage name={name} component="div" className="text-red-500 text-xs mt-1" />
  </div>
);

const FieldTextArea = ({ label, name, placeholder, touched, errors }) => (
  <div className="col-span-2">
    <label className="font-bold text-sm">{label}</label>
    <Field
      as="textarea"
      name={name}
      placeholder={placeholder}
      className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
        touched[name] && errors[name] ? "border-red-500" : "border-light-gray"
      }`}
    />
    <ErrorMessage name={name} component="div" className="text-red-500 text-xs mt-1" />
  </div>
);

export default AddClient;
