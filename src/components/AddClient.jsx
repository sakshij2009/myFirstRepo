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
import { db, storage, COLLECTION_NEW_INTAKES } from "../firebase";
import { FaChevronDown } from "react-icons/fa6";
import { Upload } from "lucide-react";
import SuccessSlider from "../components/SuccessSlider";
import { useNavigate, useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import PlacesAutocomplete from "./PlacesAutocomplete";

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
  pickupTime: "",
  dropTime: "",
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
  const [openShiftPoints, setOpenShiftPoints] = useState({});
  const [showMedications, setShowMedications] = useState(false);
  const [showPharmacy, setShowPharmacy] = useState(false);
  const [intakeId, setIntakeId] = useState(null);
  const [resyncing, setResyncing] = useState(false);

  const toggleShiftPoint = (index) =>
    setOpenShiftPoints((prev) => ({ ...prev, [index]: !prev[index] }));

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
    isFamily: false,
    clientRate: "",
    description: "",
    avatar: null,
    shiftPoints: [],
    medications: [emptyMedication],
    pharmacy: {
      pharmacyName: "",
      pharmacyEmail: "",
      pharmacyPhone: "",
      pharmacyAddress: "",
    },
  });

  const isFamily = initialValues.isFamily === true;

  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required").min(3, "Min 3 chars"),
    clientCode: isFamily
      ? Yup.string()
      : Yup.string()
          .required("Client Code is required")
          .matches(/^[A-Za-z0-9]+$/, "Only alphanumeric allowed"),
    clientStatus: isFamily
      ? Yup.string()
      : Yup.string().required("Select client status"),
    parentEmail: Yup.string().email("Invalid email"),
    agency: Yup.string().required("Agency required"),
    address: Yup.string().required("Address required"),
    dob: isFamily ? Yup.date() : Yup.date().required("Date of Birth required"),
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
              isFamily: data.isFamily === true,
              avatar: null,
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
            setIntakeId(data.intakeId || data.InTakeId || null);
            if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
              setOpenShiftPoints({ 0: true });
            }
            if (Array.isArray(data.medications) && data.medications.some(m => m.medicationName?.trim())) {
              setShowMedications(true);
            }
            if (data.pharmacy?.pharmacyName || data.pharmacy?.pharmacyEmail || data.pharmacy?.pharmacyPhone) {
              setShowPharmacy(true);
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
  }, [mode, id]);

  // ── Re-sync siblings from the original intake form ─────────────────────────
  const handleResyncSiblings = async (setFieldValue) => {
    if (!intakeId) return;
    setResyncing(true);
    try {
      const intakeSnap = await getDoc(doc(db, COLLECTION_NEW_INTAKES, String(intakeId)));
      if (!intakeSnap.exists()) {
        alert("Intake form not found. Cannot re-sync siblings.");
        return;
      }
      const intake = intakeSnap.data();

      // Normalise clients list (array or object-map)
      const clients = Array.isArray(intake.clients)
        ? intake.clients
        : Object.values(intake.clients || {});

      if (!clients.length) {
        alert("No siblings found in the intake form.");
        return;
      }

      const builtShiftPoints = clients.map((c) => {
        const transport = (intake.transportationInfoList || []).find(
          (t) => t.clientName === c.fullName
        ) || {};
        const parent = (intake.parentInfoList || []).find(
          (p) => p.clientName === c.fullName
        ) || intake.parentInfoList?.[0] || {};
        return {
          name:          c.fullName || "",
          gender:        c.gender || "Male",
          dob:           c.birthDate || "",
          seatType:      transport.carSeatType || "No Seat Required",
          pickupLocation: transport.pickupAddress || c.address || "",
          dropLocation:  transport.dropoffAddress || "",
          pickupTime:    transport.pickupTime || "",
          dropTime:      transport.dropOffTime || "",
          clientInfo:    c.clientInfo || "",
          parentName:    parent.parentName || "",
          parentPhone:   parent.parentPhone || "",
          parentEmail:   parent.parentEmail || "",
          parentAddress: parent.parentAddress || "",
          relationship:  parent.relationShip || "",
        };
      });

      setFieldValue("shiftPoints", builtShiftPoints);
      // Expand all newly loaded shift points
      const openMap = {};
      builtShiftPoints.forEach((_, i) => { openMap[i] = true; });
      setOpenShiftPoints(openMap);
    } catch (err) {
      console.error("Error re-syncing siblings:", err);
      alert("Failed to load intake form. Please try again.");
    } finally {
      setResyncing(false);
    }
  };

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

                {/* ── Family badge ── */}
                {values.isFamily && (
                  <div className="mb-5 flex items-center gap-2 px-4 py-2.5 rounded-lg border"
                    style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
                      Family Client — individual sibling details are managed in Shift Points below
                    </span>
                  </div>
                )}

                {/* ── Basic Information ── */}
                <div className="grid grid-cols-2 gap-5 mb-6">
                  {/* Name (Family Name for family clients) */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>
                      {values.isFamily ? "Family Name" : "Name"}
                    </label>
                    <Field
                      name="name"
                      placeholder={values.isFamily ? "Please enter the family name" : "Please enter the name of user"}
                      className={inputCls(touched.name && errors.name)}
                    />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Client Code — hidden for family */}
                  {!values.isFamily && (
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Code</label>
                      <Field
                        name="clientCode"
                        placeholder="Please enter a specific ID"
                        className={inputCls(touched.clientCode && errors.clientCode)}
                      />
                      <ErrorMessage name="clientCode" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  )}

                  {/* Client Status — hidden for family */}
                  {!values.isFamily && (
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
                  )}

                  {/* Password — hidden for family */}
                  {!values.isFamily && (
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
                  )}

                  {/* Parent E-Mail */}
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

                  {/* Date of Birth — hidden for family (lives in each shift point) */}
                  {!values.isFamily && (
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Date of Birth</label>
                      <Field
                        name="dob"
                        type="date"
                        className={inputCls(touched.dob && errors.dob)}
                      />
                      <ErrorMessage name="dob" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  )}

                  {/* Client KM Rate — hidden for family */}
                  {!values.isFamily && (
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client KM Rate</label>
                      <Field
                        name="kmRate"
                        placeholder="Please enter the KM Rate"
                        className={inputCls(touched.kmRate && errors.kmRate)}
                      />
                      <ErrorMessage name="kmRate" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  )}

                  {/* Client Rate — hidden for family */}
                  {!values.isFamily && (
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Rate</label>
                      <Field
                        name="clientRate"
                        placeholder="Please enter the Rate"
                        className={inputCls(touched.clientRate && errors.clientRate)}
                      />
                      <ErrorMessage name="clientRate" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  )}

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

                {/* ── Shift Points Section ── */}
                <div className="pt-6 border-t" style={{ borderColor: "#f3f4f6" }}>
                  <FieldArray name="shiftPoints">
                    {(arrayHelpers) => (
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="font-bold text-gray-900" style={{ fontSize: 17 }}>
                              {values.isFamily ? "Siblings / Family Members" : "Shift Points"}
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                              {values.isFamily
                                ? "Each entry is a sibling — includes their individual info, transport, and parent details."
                                : "Family clients — each entry is a sibling or member."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {values.isFamily && intakeId && values.shiftPoints && values.shiftPoints.length > 0 && (
                              <button
                                type="button"
                                disabled={resyncing}
                                onClick={() => handleResyncSiblings(setFieldValue)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                                style={{ border: "1px solid #6b7280", color: "#6b7280", opacity: resyncing ? 0.6 : 1 }}
                                title="Re-load siblings from original intake form"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                </svg>
                                {resyncing ? "Syncing…" : "Re-sync"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const nextIndex = values.shiftPoints?.length || 0;
                                arrayHelpers.push({ ...emptyShiftPoint });
                                setOpenShiftPoints((prev) => ({ ...prev, [nextIndex]: true }));
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                              style={{ border: "1px solid #1f7a3c", color: "#1f7a3c" }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1f7a3c"; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#1f7a3c"; }}
                            >
                              <span className="text-base leading-none">+</span> Add Shift Point
                            </button>
                          </div>
                        </div>

                        {(!values.shiftPoints || values.shiftPoints.length === 0) && (
                          <div className="rounded-lg border p-4" style={{ borderColor: "#e5e7eb" }}>
                            {values.isFamily && intakeId ? (
                              <div className="flex flex-col items-start gap-3">
                                <p className="text-sm" style={{ color: "#9ca3af" }}>
                                  No siblings loaded yet. Re-sync to pull sibling data from the original intake form.
                                </p>
                                <button
                                  type="button"
                                  disabled={resyncing}
                                  onClick={() => handleResyncSiblings(setFieldValue)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all text-white"
                                  style={{ backgroundColor: resyncing ? "#9ca3af" : "#1f7a3c", cursor: resyncing ? "not-allowed" : "pointer" }}
                                >
                                  {resyncing ? (
                                    <>
                                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/></svg>
                                      Loading siblings…
                                    </>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                      </svg>
                                      Re-sync Siblings from Intake Form
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm" style={{ color: "#9ca3af" }}>
                                No shift points added yet. Click <b>+ Add Shift Point</b> to add one.
                              </p>
                            )}
                          </div>
                        )}

                        {values.shiftPoints && values.shiftPoints.map((sp, index) => {
                          const isOpen = !!openShiftPoints[index];
                          const headerTitle = sp?.name?.trim() ? sp.name : `Shift Point #${index + 1}`;
                          return (
                            <div key={index} className="rounded-lg border mb-3 overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                              <div className="flex items-center justify-between px-4 py-3" style={{ background: "#fafafa" }}>
                                <div>
                                  <p className="font-semibold text-sm" style={{ color: "#111827" }}>{headerTitle}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => toggleShiftPoint(index)}
                                    className="px-3 py-1 rounded-lg border text-xs font-semibold transition-all hover:bg-gray-100"
                                    style={{ borderColor: "#1f7a3c", color: "#1f7a3c" }}>
                                    {isOpen ? "Close" : "Edit"}
                                  </button>
                                  <button type="button" onClick={() => {
                                    arrayHelpers.remove(index);
                                    const next = {};
                                    if ((values.shiftPoints?.length || 0) - 1 > 0) next[0] = true;
                                    setOpenShiftPoints(next);
                                  }}
                                    className="px-3 py-1 rounded-lg border text-xs font-semibold transition-all hover:bg-red-50"
                                    style={{ borderColor: "#ef4444", color: "#ef4444" }}>
                                    Delete
                                  </button>
                                </div>
                              </div>

                              {isOpen && (
                                <div className="grid grid-cols-2 gap-4 p-4">
                                  {/* Name */}
                                  <div>
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name</label>
                                    <Field name={`shiftPoints[${index}].name`} placeholder="Enter name" className={inputCls(false)} />
                                    <ErrorMessage name={`shiftPoints[${index}].name`} component="div" className="text-red-500 text-xs mt-1" />
                                  </div>

                                  {/* Seat Type */}
                                  <div>
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Seat Type</label>
                                    <Field as="select" name={`shiftPoints[${index}].seatType`} className={inputCls(false)}>
                                      <option value="Forward Facing Seat">Forward Facing Seat</option>
                                      <option value="Rear Facing Seat">Rear Facing Seat</option>
                                      <option value="Booster Seat">Booster Seat</option>
                                      <option value="No Seat Required">No Seat Required</option>
                                    </Field>
                                  </div>

                                  {/* Gender */}
                                  <div>
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Gender</label>
                                    <Field as="select" name={`shiftPoints[${index}].gender`} className={inputCls(false)}>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                    </Field>
                                  </div>

                                  {/* DOB */}
                                  <div>
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Date of Birth</label>
                                    <Field type="date" name={`shiftPoints[${index}].dob`} className={inputCls(false)} />
                                  </div>

                                  {/* Pickup Time */}
                                  <div>
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pickup Time</label>
                                    <Field type="time" name={`shiftPoints[${index}].pickupTime`} className={inputCls(false)} />
                                  </div>

                                  {/* Drop Time */}
                                  <div>
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Drop Time</label>
                                    <Field type="time" name={`shiftPoints[${index}].dropTime`} className={inputCls(false)} />
                                  </div>

                                  {/* Pickup Location */}
                                  <div className="col-span-2">
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pickup Location</label>
                                    <Field as="textarea" rows={2} name={`shiftPoints[${index}].pickupLocation`} placeholder="Enter pickup location" className={`${inputCls(false)} resize-none`} />
                                  </div>

                                  {/* Drop Location */}
                                  <div className="col-span-2">
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Drop Location</label>
                                    <Field as="textarea" rows={2} name={`shiftPoints[${index}].dropLocation`} placeholder="Enter drop location" className={`${inputCls(false)} resize-none`} />
                                  </div>

                                  {/* ── Family-only fields ── */}
                                  {values.isFamily && (
                                    <>
                                      {/* Client Info / Service Notes */}
                                      <div className="col-span-2">
                                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Info / Service Notes</label>
                                        <Field as="textarea" rows={2} name={`shiftPoints[${index}].clientInfo`} placeholder="Individual client notes" className={`${inputCls(false)} resize-none`} />
                                      </div>

                                      {/* Parent / Guardian section */}
                                      <div className="col-span-2 pt-3 border-t mt-2" style={{ borderColor: "#f3f4f6" }}>
                                        <p className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>Parent / Guardian</p>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: "#374151" }}>Name</label>
                                            <Field name={`shiftPoints[${index}].parentName`} placeholder="Parent name" className={inputCls(false)} />
                                          </div>
                                          <div>
                                            <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: "#374151" }}>Relationship</label>
                                            <Field name={`shiftPoints[${index}].relationship`} placeholder="e.g. Mother, Father" className={inputCls(false)} />
                                          </div>
                                          <div>
                                            <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: "#374151" }}>Phone</label>
                                            <Field name={`shiftPoints[${index}].parentPhone`} placeholder="Parent phone" className={inputCls(false)} />
                                          </div>
                                          <div>
                                            <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: "#374151" }}>Email</label>
                                            <Field type="email" name={`shiftPoints[${index}].parentEmail`} placeholder="Parent email" className={inputCls(false)} />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: "#374151" }}>Address</label>
                                            <Field name={`shiftPoints[${index}].parentAddress`} placeholder="Parent address" className={inputCls(false)} />
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  <div className="col-span-2 flex justify-end">
                                    <button type="button" onClick={() => toggleShiftPoint(index)}
                                      className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                      style={{ border: "1px solid #1f7a3c", color: "#1f7a3c" }}>
                                      Save &amp; Close
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
                </div>

                {/* ── Pharmacy Section ── */}
                <div className="pt-6 border-t" style={{ borderColor: "#f3f4f6" }}>
                  {!showPharmacy ? (
                    <button
                      type="button"
                      onClick={() => setShowPharmacy(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                      style={{ border: "1px dashed #1f7a3c", color: "#1f7a3c" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f0fdf4"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span className="text-base leading-none">+</span> Add Pharmacy
                    </button>
                  ) : (
                  <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-gray-900" style={{ fontSize: 17 }}>Pharmacy Information</h3>
                    <button
                      type="button"
                      onClick={() => setShowPharmacy(false)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                      style={{ border: "1px solid #e5e7eb", color: "#6b7280" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pharmacy Name</label>
                      <Field name="pharmacy.pharmacyName" placeholder="Enter pharmacy name" className={inputCls(false)} />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pharmacy Email</label>
                      <Field type="email" name="pharmacy.pharmacyEmail" placeholder="Enter pharmacy email" className={inputCls(false)} />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pharmacy Phone</label>
                      <Field name="pharmacy.pharmacyPhone" placeholder="Enter phone number" className={inputCls(false)} />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pharmacy Address</label>
                      <Field name="pharmacy.pharmacyAddress" placeholder="Enter address" className={inputCls(false)} />
                    </div>
                  </div>
                  </div>
                  )}
                </div>

                {/* ── Medications Section ── */}
                <div className="pt-6 border-t" style={{ borderColor: "#f3f4f6" }}>
                  {!showMedications ? (
                    <button
                      type="button"
                      onClick={() => setShowMedications(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                      style={{ border: "1px dashed #1f7a3c", color: "#1f7a3c" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f0fdf4"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span className="text-base leading-none">+</span> Add Medical Info
                    </button>
                  ) : (
                  <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-gray-900" style={{ fontSize: 17 }}>Medications Information</h3>
                    <div className="flex items-center gap-2">
                    <FieldArray name="medications">
                      {(arrayHelpers) => (
                        <button
                          type="button"
                          onClick={() => arrayHelpers.push({ ...emptyMedication })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                          style={{ border: "1px solid #1f7a3c", color: "#1f7a3c" }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1f7a3c"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#1f7a3c"; }}
                        >
                          <span className="text-base leading-none">+</span> Add Medicine
                        </button>
                      )}
                    </FieldArray>
                    <button
                      type="button"
                      onClick={() => setShowMedications(false)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                      style={{ border: "1px solid #e5e7eb", color: "#6b7280" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Remove
                    </button>
                    </div>
                  </div>

                  <FieldArray name="medications">
                    {(arrayHelpers) => (
                      <div className="flex flex-col gap-6">
                        {values.medications && values.medications.map((med, index) => (
                          <div key={index}>
                            {index > 0 && (
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-gray-500">Medication #{index + 1}</p>
                                <button type="button" onClick={() => arrayHelpers.remove(index)} className="text-xs text-red-500 hover:underline">Remove</button>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-5">
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name of Medications</label>
                                <Field name={`medications[${index}].medicationName`} placeholder="Please write down the medication Name" className={inputCls(touched.medications?.[index]?.medicationName && errors.medications?.[index]?.medicationName)} />
                                <ErrorMessage name={`medications[${index}].medicationName`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Dosage</label>
                                <Field name={`medications[${index}].dosage`} placeholder="Write down how many dosage" className={inputCls(touched.medications?.[index]?.dosage && errors.medications?.[index]?.dosage)} />
                                <ErrorMessage name={`medications[${index}].dosage`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Timing</label>
                                <Field name={`medications[${index}].timing`} placeholder="e.g. Morning and Evening" className={inputCls(touched.medications?.[index]?.timing && errors.medications?.[index]?.timing)} />
                                <ErrorMessage name={`medications[${index}].timing`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Description</label>
                                <Field as="textarea" name={`medications[${index}].medicineDescription`} placeholder="Describe the medicine" rows={3} className={`${inputCls(touched.medications?.[index]?.medicineDescription && errors.medications?.[index]?.medicineDescription)} resize-none`} />
                                <ErrorMessage name={`medications[${index}].medicineDescription`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Reasons of Medications</label>
                                <Field as="textarea" name={`medications[${index}].reasonOfMedication`} placeholder="Write the reason for medication" rows={3} className={`${inputCls(touched.medications?.[index]?.reasonOfMedication && errors.medications?.[index]?.reasonOfMedication)} resize-none`} />
                                <ErrorMessage name={`medications[${index}].reasonOfMedication`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Cautions</label>
                                <Field as="textarea" name={`medications[${index}].cautions`} placeholder="Write any cautions" rows={3} className={`${inputCls(touched.medications?.[index]?.cautions && errors.medications?.[index]?.cautions)} resize-none`} />
                                <ErrorMessage name={`medications[${index}].cautions`} component="div" className="text-red-500 text-xs mt-1" />
                              </div>
                            </div>
                            {index < values.medications.length - 1 && (
                              <div className="mt-6 border-b" style={{ borderColor: "#f3f4f6" }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                  </div>
                  )}
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
