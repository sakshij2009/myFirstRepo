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
import { Upload } from "lucide-react";
import SuccessSlider from "../components/SuccessSlider";
import { useNavigate, useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import PlacesAutocomplete from "./PlacesAutocomplete";

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
    description: Yup.string(),
  });

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
      let customId = Date.now().toString();
      let photoURL = avatarPreview;

      if (values.avatar) {
        const storageRef = ref(storage, `client-images/${values.avatar.name}`);
        await uploadBytes(storageRef, values.avatar);
        photoURL = await getDownloadURL(storageRef);
      }

      const medications = values.medications || [];
      const dataToSave = {
        ...values,
        avatar: photoURL || "",
        medications,
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
        } else {
          setSlider({ show: true, title: "Client Not Found!", subtitle: "", viewText: "" });
        }
      } else {
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

      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminsSnapshot = await getDocs(q);
      const admins = adminsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      for (const admin of admins) {
        await sendNotification(admin.id, {
          type: "info",
          title: mode === "add" ? "New Client Created" : "Client Updated",
          message:
            mode === "add"
              ? `A new Client "${values.name}" has been added.`
              : `Client "${values.name}" has been updated.`,
          senderId: user.name,
          meta: { clientId: customId, clientName: values.name, entity: "Client" },
        });
      }
    } catch (error) {
      console.error("❌ Error saving client:", error);
      setSlider({ show: true, title: "Error Saving Client!", subtitle: "Please try again.", viewText: "" });
    }
  };

  const inputCls = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-700 placeholder-gray-400 ${
      hasError ? "border-red-400" : "border-[#e5e7eb]"
    }`;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50 text-[13px]"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        <h1 className="font-bold text-2xl text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          {mode === "update" ? "Update Client" : "Add Client"}
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          {mode === "update" ? "Update an existing client profile" : "Create a new client profile"}
        </p>
      </div>

      <div>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue }) => (
            <Form>
              {/* Single white card */}
              <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                {/* ── Avatar Section ── */}
                <div className="mb-6 pb-6 border-b" style={{ borderColor: "#f3f4f6" }}>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="rounded-full object-cover" style={{ width: 80, height: 80 }} />
                      ) : (
                        <div className="rounded-full bg-gray-100 flex items-center justify-center" style={{ width: 80, height: 80 }}>
                          <Upload className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="avatarInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarChange(e, setFieldValue)}
                      />
                      <label
                        htmlFor="avatarInput"
                        className="px-3 py-2 rounded-lg font-semibold transition-all text-white cursor-pointer text-xs"
                        style={{ backgroundColor: "#1f7a3c" }}
                      >
                        Change Avatar
                      </label>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAvatar(setFieldValue)}
                          className="px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50 text-xs"
                          style={{ borderColor: "#e5e7eb", color: "#374151" }}
                        >
                          Remove Avatar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Basic Information ── */}
                <div className="grid grid-cols-2 gap-5 mb-6">
                  {/* Name */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name</label>
                    <Field
                      name="name"
                      placeholder="Please enter the name of user"
                      className={inputCls(touched.name && errors.name)}
                    />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Client Code */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Code</label>
                    <Field
                      name="clientCode"
                      placeholder="Please enter a specific ID"
                      className={inputCls(touched.clientCode && errors.clientCode)}
                    />
                    <ErrorMessage name="clientCode" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Client Status */}
                  <div className="relative">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Status</label>
                    <Field
                      as="select"
                      name="clientStatus"
                      className={`${inputCls(touched.clientStatus && errors.clientStatus)} appearance-none pr-9 ${values.clientStatus === "" ? "text-gray-400" : "text-gray-700"}`}
                    >
                      <option value="">Select client status</option>
                      <option value="Active">Active</option>
                      <option value="InActive">InActive</option>
                    </Field>
                    <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                      <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                    </span>
                    <ErrorMessage name="clientStatus" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Password</label>
                    <Field
                      name="password"
                      type="password"
                      placeholder="Please enter a specific password"
                      className={inputCls(touched.password && errors.password)}
                    />
                    <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Parent Email */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Parent E-Mail</label>
                    <Field
                      name="parentEmail"
                      type="email"
                      placeholder="Please enter the e-mail ID"
                      className={inputCls(touched.parentEmail && errors.parentEmail)}
                    />
                    <ErrorMessage name="parentEmail" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Agency */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Agency</label>
                    <Field
                      name="agency"
                      placeholder="Please enter the agency name"
                      className={inputCls(touched.agency && errors.agency)}
                    />
                    <ErrorMessage name="agency" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Address</label>
                    <PlacesAutocomplete
                      className={inputCls(touched.address && errors.address)}
                      value={values.address}
                      onChange={(v) => setFieldValue("address", v)}
                      placeholder="Please enter the address"
                    />
                    <ErrorMessage name="address" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Date of Birth</label>
                    <Field
                      name="dob"
                      type="date"
                      className={inputCls(touched.dob && errors.dob)}
                    />
                    <ErrorMessage name="dob" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Description – full width */}
                  <div className="col-span-2">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Description of Client</label>
                    <Field
                      as="textarea"
                      name="description"
                      placeholder="Write the description of the client"
                      rows={4}
                      className={`${inputCls(touched.description && errors.description)} resize-none`}
                    />
                    <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                </div>

                {/* ── Medications Section ── */}
                <div className="pt-6 border-t" style={{ borderColor: "#f3f4f6" }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-gray-900" style={{ fontSize: 17 }}>Medications Information</h3>
                    <FieldArray name="medications">
                      {(arrayHelpers) => (
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                          style={{ border: "1px solid #1f7a3c", color: "#1f7a3c" }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1f7a3c"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#1f7a3c"; }}
                        >
                          <span className="text-base leading-none">+</span> Add Medicine
                        </button>
                      )}
                    </FieldArray>
                  </div>

                  <FieldArray name="medications">
                    {(arrayHelpers) => (
                      <div className="flex flex-col gap-6">
                        {values.medications && values.medications.map((med, index) => (
                          <div key={index}>
                            {index > 0 && (
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-gray-500">Medication #{index + 1}</p>
                                <button
                                  type="button"
                                  onClick={() => arrayHelpers.remove(index)}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-5">
                              {/* Name of Medications */}
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name of Medications</label>
                                <Field
                                  name={`medications[${index}].medicationName`}
                                  placeholder="Please write down the medication Name"
                                  className={inputCls(
                                    touched.medications?.[index]?.medicationName &&
                                    errors.medications?.[index]?.medicationName
                                  )}
                                />
                                <ErrorMessage name={`medications[${index}].medicationName`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>

                              {/* Dosage */}
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Dosage</label>
                                <Field
                                  name={`medications[${index}].dosage`}
                                  placeholder="Write down how many dosage"
                                  className={inputCls(
                                    touched.medications?.[index]?.dosage &&
                                    errors.medications?.[index]?.dosage
                                  )}
                                />
                                <ErrorMessage name={`medications[${index}].dosage`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>

                              {/* Description – full width */}
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Description</label>
                                <Field
                                  as="textarea"
                                  name={`medications[${index}].medicineDescription`}
                                  placeholder="Describe the medicine"
                                  rows={3}
                                  className={`${inputCls(
                                    touched.medications?.[index]?.medicineDescription &&
                                    errors.medications?.[index]?.medicineDescription
                                  )} resize-none`}
                                />
                                <ErrorMessage name={`medications[${index}].medicineDescription`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>

                              {/* Reasons – full width */}
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Reasons of Medications</label>
                                <Field
                                  as="textarea"
                                  name={`medications[${index}].reasonOfMedication`}
                                  placeholder="Write the reason for medication"
                                  rows={3}
                                  className={`${inputCls(
                                    touched.medications?.[index]?.reasonOfMedication &&
                                    errors.medications?.[index]?.reasonOfMedication
                                  )} resize-none`}
                                />
                                <ErrorMessage name={`medications[${index}].reasonOfMedication`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>

                              {/* Cautions – full width */}
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Cautions</label>
                                <Field
                                  as="textarea"
                                  name={`medications[${index}].cautions`}
                                  placeholder="Write any cautions"
                                  rows={3}
                                  className={`${inputCls(
                                    touched.medications?.[index]?.cautions &&
                                    errors.medications?.[index]?.cautions
                                  )} resize-none`}
                                />
                                <ErrorMessage name={`medications[${index}].cautions`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                            </div>

                            {/* Separator between medication entries */}
                            {index < values.medications.length - 1 && (
                              <div className="mt-6 border-b" style={{ borderColor: "#f3f4f6" }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                </div>

                {/* ── Submit ── */}
                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-5 py-2.5 rounded-lg border font-semibold text-sm transition-all hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb", color: "#374151" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
                    style={{ backgroundColor: "#1f7a3c" }}
                  >
                    {mode === "update" ? "Update Client" : "Submit"}
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
            setSlider({ ...slider, show: false });
          }}
          onDismiss={() => setSlider({ ...slider, show: false })}
        />
      </div>
    </div>
  );
};

export default AddClient;
