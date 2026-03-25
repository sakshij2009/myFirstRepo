import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import { getDocs, collection, doc, setDoc, getDoc, query, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { FaChevronDown } from "react-icons/fa";
import SuccessSlider from "./SuccessSlider";
import { sendNotification } from "../utils/notificationHelper";
import { useNavigate, useParams } from "react-router-dom";
import PlacesAutocomplete from "./PlacesAutocomplete";


const AddAgency = ({  mode = "add", user }) => {

 const{id}=useParams();
 const navigate=useNavigate();

  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",

  });

  const [createdAgency, setCreatedAgency] = useState(null);


  const [avatarPreview, setAvatarPreview] = useState(null);
  const [agencyType, setAgencyType] = useState([]);
  const [initialValues, setInitialValues] = useState(null);

  // List of all services with labels
  const serviceList = [
    { name: "Emergent Care", key: "emergentBillingCare" },
    { name: "Respite Care", key: "respiteCareBilling" },
    { name: "Supervised Visitation", key: "supervisedVisitationsBilling" },
    { name: "Transportation", key: "transportationsBilling" },
  ];

  // Fetch agency types dynamically
  useEffect(() => {
    const fetchAgencyTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "AgencyTypes"));
        const typeList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setAgencyType(typeList);
      } catch (error) {
        console.error("Error fetching agency types:", error);
      }
    };
    fetchAgencyTypes();
  }, []);

  useEffect(() => {
  const fetchAgency = async () => {

    if (mode === "update" && id) {
      try {
        const docRef = doc(db, "agencies", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // console.log(data);
          setInitialValues({
            agencyType: data.agencyType || "",
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            description: data.description || "",
            avatar: null,
             rateList: serviceList.map((service) => {
            const matched = data.rateList?.find((rate) => rate.name === service.name);
            return {
              name: service.name,
              billingRate: matched ? matched.rate || matched.billingRate || "" : "",
              kmRate: matched ? matched.kmRate || "" : "",
            };
          }),
          });

          if (data.avatar) setAvatarPreview(data.avatar);
        } else {
          console.error("❌ No agency found with ID:", id);
        }
      } catch (err) {
        console.error("Error fetching agency:", err);
      }
    }
  };
  fetchAgency();
}, [mode, id]);




  // Validation schema
  const validationSchema = Yup.object({
    agencyType: Yup.string().required("Please select agency type"),
    name: Yup.string().required("Agency name is required"),
    email: Yup.string().required("Email is required").email("Invalid email"),
    phone: Yup.string()
      .required("Phone number is required")
      .matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
    address: Yup.string().required("Address is required"),
    description: Yup.string().max(
      200,
      "Description cannot exceed 200 characters"
    ),
    rateList: Yup.array().of(
      Yup.object().shape({
        billingRate: Yup.number()
          .typeError("Must be a number")
          .required("Billing rate is required")
          .min(0, "Cannot be negative"),
        kmRate: Yup.number()
          .typeError("Must be a number")
          .required("Kilometer rate is required")
          .min(0, "Cannot be negative"),
      })
    ),
  });

  // Avatar change
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

  // Submit form
const handleSubmit = async (values, { resetForm }) => {
  try {
    let photoURL = avatarPreview || "";

    if (values.avatar) {
      const storageRef = ref(storage, `agency-images/${values.avatar.name}`);
      await uploadBytes(storageRef, values.avatar);
      photoURL = await getDownloadURL(storageRef);
    }

    const agencyId = mode === "update" ? id : Date.now().toString();

    // ✅ Attach proper service names to rateList before saving
    const rateListWithNames = serviceList.map((service, index) => ({
      name: service.name,
      billingRate: values.rateList[index]?.billingRate || 0,
      kmRate: values.rateList[index]?.kmRate || 0,
    }));

    const dataToSave = {
      id: agencyId,
      ...values,
      rateList: rateListWithNames, // ✅ Updated rateList with names
      avatar: photoURL,
      updatedAt: new Date(),
      ...(mode === "add" && { createdAt: new Date() }),
    };

    if (mode === "update") {
      const q = query(collection(db, "agencies"), where("id", "==", id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, "agencies", docId), dataToSave);
        setSlider({
          show: true,
          title: "Agency Updated Successfully!",
          subtitle: `${values.name} ${values.agencyType}`,
        });
      }
    } else {
      await setDoc(doc(db, "agencies", agencyId), dataToSave);
      setSlider({
        show: true,
        title: "Agency Added Successfully!",
        subtitle: `${values.name} ${values.agencyType}`,
      });
    }

    // ✅ Notify admins (unchanged)
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnapshot = await getDocs(q);
    const admins = adminsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    for (const admin of admins) {
      await sendNotification(admin.id, {
        type: "info",
        title: mode === "add" ? "New Agency Created" : "Agency Updated",
        message:
          mode === "add"
            ? `A new agency "${values.name}" has been added.`
            : `Agency "${values.name}" has been updated.`,
        senderId: user.name,
        meta: {
          agencyId: agencyId,
          agencyName: values.name,
          entity: "Agency",
        },
      });
    }

    setCreatedAgency(dataToSave);
    resetForm();
    setAvatarPreview(null);
  } catch (error) {
    console.error("Error saving agency:", error);
    setSlider({
      show: true,
      title: "Error Saving Agency!",
      subtitle: "Please try again.",
      viewText: "",
    });
  }
};

  const inputCls = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-700 placeholder-gray-400 ${
      hasError ? "border-red-400" : "border-[#e5e7eb]"
    }`;

  const selectCls = (hasError, empty) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm appearance-none pr-9 ${
      hasError ? "border-red-400" : "border-[#e5e7eb]"
    } ${empty ? "text-gray-400" : "text-gray-700"}`;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
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
            {mode === "update" ? "Update Agency" : "Add Agency"}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {mode === "update" ? "Update an existing agency partnership" : "Create a new agency partnership"}
          </p>
        </div>
      </div>

      <div>
        <Formik
          initialValues={
            initialValues || {
              agencyType: "",
              name: "",
              email: "",
              phone: "",
              address: "",
              description: "",
              avatar: null,
              globalKmRate: "",
              rateList: serviceList.map(() => ({ billingRate: "", kmRate: "" })),
            }
          }
          enableReinitialize
          validationSchema={mode === "add" ? validationSchema : ""}
          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue }) => (
            <Form className="flex flex-col gap-5">

              {/* ── Main Info Card ── */}
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                {/* Avatar section */}
                <div className="flex items-center gap-5 px-6 py-5 border-b" style={{ borderColor: "#f3f4f6" }}>
                  <div className="flex-shrink-0 rounded-full overflow-hidden bg-gray-100" style={{ width: 80, height: 80 }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Agency Logo" className="h-full w-full object-cover" />
                    ) : (
                      <img src="/images/profile.jpeg" className="h-full w-full object-cover" alt="default" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm mb-0.5">Agency Logo</p>
                    <p className="text-xs text-gray-400 mb-2.5">JPG, PNG up to 5MB</p>
                    <div className="flex gap-2">
                      <input id="avatarInput" type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleAvatarChange(e, setFieldValue)} />
                      <label htmlFor="avatarInput"
                        className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                        style={{ backgroundColor: "#145228" }}>
                        Change Logo
                      </label>
                      <button type="button" onClick={() => handleRemoveAvatar(setFieldValue)}
                        className="px-3 py-1.5 border text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#e5e7eb" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fields grid */}
                <div className="p-6">
                  <p className="font-semibold mb-4 uppercase tracking-wide" style={{ fontSize: 11, color: "#9ca3af" }}>Agency Information</p>
                  <div className="grid grid-cols-2 gap-5">

                    {/* Agency Type */}
                    <div className="relative">
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Agency Type</label>
                      <Field as="select" name="agencyType" className={selectCls(touched.agencyType && errors.agencyType, !values.agencyType)}>
                        <option value="">Select agency type</option>
                        {agencyType.map((item) => (
                          <option key={item.id} value={item.name}>{item.name}</option>
                        ))}
                      </Field>
                      <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                        <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                      </span>
                      <ErrorMessage name="agencyType" component="div" className="text-red-500 text-xs mt-1" />
                    </div>

                    {/* Agency Name */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Agency Name</label>
                      <Field name="name" type="text" placeholder="Enter agency name" className={inputCls(touched.name && errors.name)} />
                      <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Email</label>
                      <Field name="email" type="email" placeholder="Enter agency email" className={inputCls(touched.email && errors.email)} />
                      <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Phone</label>
                      <Field name="phone" type="text" placeholder="Enter phone number" className={inputCls(touched.phone && errors.phone)} />
                      <ErrorMessage name="phone" component="div" className="text-red-500 text-xs mt-1" />
                    </div>

                    {/* Address */}
                    <div className="col-span-2">
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Address</label>
                      <PlacesAutocomplete
                        placeholder="Enter agency address"
                        className={inputCls(touched.address && errors.address)}
                        value={values.address}
                        onChange={(v) => setFieldValue("address", v)}
                      />
                      <ErrorMessage name="address" component="div" className="text-red-500 text-xs mt-1" />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Description</label>
                      <Field as="textarea" name="description" placeholder="Write a description of the agency" rows={4}
                        className={`${inputCls(touched.description && errors.description)} resize-none`} />
                      <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Service Rates Card ── */}
              <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-bold text-gray-900 mb-1" style={{ fontSize: 15 }}>Agency Service Rates</p>
                    <p className="text-[12px] text-gray-400">Billing and kilometre rates per service type</p>
                  </div>
                  <div className="w-1/3">
                    <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: "#374151" }}>Standard KM Rate</label>
                    <Field 
                      name="globalKmRate" 
                      type="number" 
                      placeholder="Apply to all services" 
                      className={inputCls(false)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFieldValue("globalKmRate", val);
                        values.rateList.forEach((_, idx) => {
                          setFieldValue(`rateList[${idx}].kmRate`, val);
                        });
                      }}
                    />
                  </div>
                </div>
                <FieldArray name="rateList">
                  {() => (
                    <div className="grid grid-cols-2 gap-4">
                      {serviceList.map((service, index) => (
                        <div key={service.key} className="rounded-xl border p-4" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                          <p className="font-bold text-gray-800 mb-3" style={{ fontSize: 13 }}>{service.name}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold mb-1.5 uppercase tracking-wide" style={{ fontSize: 10, color: "#9ca3af" }}>Billing Rate</label>
                              <Field name={`rateList[${index}].billingRate`} type="number" placeholder="0.00"
                                className={inputCls(touched.rateList?.[index]?.billingRate && errors.rateList?.[index]?.billingRate)} />
                              <ErrorMessage name={`rateList[${index}].billingRate`} component="div" className="text-red-500 text-xs mt-1" />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1.5 uppercase tracking-wide" style={{ fontSize: 10, color: "#9ca3af" }}>KM Rate</label>
                              <Field name={`rateList[${index}].kmRate`} type="number" placeholder="0.00"
                                className={inputCls(touched.rateList?.[index]?.kmRate && errors.rateList?.[index]?.kmRate)} />
                              <ErrorMessage name={`rateList[${index}].kmRate`} component="div" className="text-red-500 text-xs mt-1" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </FieldArray>
              </div>

              {/* ── Footer ── */}
              <div className="bg-white rounded-xl border flex items-center justify-end gap-3 px-6 py-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <button type="button" onClick={() => navigate(-1)}
                  className="px-5 py-2.5 rounded-lg border font-semibold text-sm hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors"
                  style={{ backgroundColor: "#145228" }}>
                  {mode === "update" ? "Update Agency" : "Add Agency"}
                </button>
              </div>

            </Form>
          )}
        </Formik>

        <SuccessSlider
          show={slider.show}
          title={slider.title}
          subtitle={slider.subtitle}
          viewText={slider.viewText}
          onView={() => {
            if (createdAgency) setInitialValues(createdAgency);
            navigate("/admin-dashboard/agency")
            setSlider({ ...slider, show: false });
          }}
          onDismiss={() => setSlider({ ...slider, show: false })}
        />
      </div>
    </div>
  );
};

export default AddAgency;
