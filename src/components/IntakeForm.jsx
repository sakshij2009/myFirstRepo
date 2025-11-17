
import React, { useEffect, useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { getFirestore, doc, setDoc, getDocs, collection, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db,storage } from "../firebase";
import { FaChevronDown, FaPlus } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa6";
import { Upload, X } from "lucide-react";
import { FaRegUserCircle } from "react-icons/fa";
import { FieldArray } from "formik";
import SignatureCanvas from "react-signature-canvas";
import { useParams, useSearchParams } from "react-router-dom";

 

const IntakeForm = ({   mode = "add" ,isCaseWorker: propCaseWorker }) => {
  
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [shiftCategories, setShiftCategories] = useState([]);
  const [showTransportation, setShowTransportation] = useState(false);
  const [showVisitation, setShowVisitation] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputRefMedical = useRef(null);
  

   
   const { id } = useParams(); 
   const [searchParams] = useSearchParams();
   const formType = searchParams.get("type"); 

    const urlCaseWorker = formType === "IntakeWorker";

  // FINAL LOGIC:
  // use propCaseWorker if provided, else use urlCaseWorker
  const isCaseWorker = propCaseWorker ?? urlCaseWorker;


  // signature canvas ref (kept at component scope so handleSubmit can access it)
  const sigCanvas = useRef(null);

  useEffect(() => {
    const fetchShiftCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "shiftCategories"));
        const categories = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setShiftCategories(categories);
      } catch (error) {
        console.error("Error fetching shift categories:", error);
      }
    };

    fetchShiftCategories();
  }, []);

  // ✅ Changes: initialValues updated to support per-client lists for Parent/Medical/Transport
  const[initialValues,setInitialValues]=useState({
    // Top-level
    name: "",
    dateOfIntake: "",
    avatar: null,

    // Services grouped
    services: {
      serviceType: "",
      servicePhone: "",
      serviceEmail: "",
      serviceStartDetails: "",
      serviceDesc: "",
      safetyPlan:"",
    },

    // Clients (siblings) — FieldArray will manage this; start with one client
    clients: [
      {
        fullName: "",
        gender: "",
        birthDate: "",
        address: "",
        startDate: "",
        clientInfo: "",
        phone: "",
        email: "",
      },
    ],

    // Billing
    billingInfo: {
      invoiceEmail: "",
    },

    // ✅ Replaced single grouped parent/medical/transport with *lists* so each entry can belong to a client
    parentInfoList: [
    {
      clientName: "",
      parentName: "",
      relationShip: "",
      parentPhone: "",
      parentEmail: "",
      parentAddress: "",
    },
  ],

  medicalInfoList: [
    {
      clientName: "",
      healthCareNo: "",
      diagnosis: "",
      diagnosisType: "",
      medicalConcern: "",
      mobilityAssistance: "",
      mobilityInfo: "",
      communicationAid: "",
      communicationInfo: "",
    },
  ],

  transportationInfoList: [
    {
      clientName: "",
      pickupAddress: "",
      dropoffAddress: "",
      pickupTime: "",
      dropOffTime: "",
      transportationOverview: "",
      carSeatType:"",
    },
  ],

   
  supervisedVisitations: [
  {
    visitStartTime: "",
    visitEndTime: "",
    visitDuration: "",
    visitPurpose: "",
    visitAddress: "",
    visitOverview: ""
  },
],

    workerInfo: {
      workerName: "",
      date: "",
      signature: ""
    },

    // Uploads
    uploadDocs: [],
    uploadMedicalDocs: []
  });

  // ✅ Fetch intake form data in update mode
  useEffect(() => {
    const fetchIntakeForm = async () => {
      if (mode === "update" && id) {
        try {
          const intakeRef = doc(db, "InTakeForms", id);
          const intakeSnap = await getDoc(intakeRef);
          if (intakeSnap.exists()) {
            const data = intakeSnap.data();
            setInitialValues({
              name: data.name || "",
              dateOfIntake: data.dateOfIntake || "",
              services: data.services || {
                serviceType: "",
                servicePhone: "",
                serviceEmail: "",
                serviceStartDetails: "",
                serviceDesc: ""
              },
              clients: data.clientsArray || [],
              billingInfo: data.billingInfo || { invoiceEmail: "" },
              parentInfoList: data.parentInfoList || [],
              medicalInfoList: data.medicalInfoList || [],
              transportationInfoList: data.transportationInfoList || [],
              supervisedVisitations: data.supervisedVisitations || [],
              workerInfo: data.workerInfo || { workerName: "", date: "", signature: "" },
              uploadDocs: data.uploadedDocs || [],
              uploadMedicalDocs: data.uploadedMedicalDocs || [],
            });
            if (data.avatar) setAvatarPreview(data.avatar);
          } else {
            console.warn("No intake form found with ID:", id);
          }
        } catch (err) {
          console.error("Error fetching intake form:", err);
        }
      }
    };
    fetchIntakeForm();
  }, [mode, id]);

  // Validation left mostly as before; you can expand to validate the new lists if needed
  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    dateOfIntake: Yup.string().required("Date of intake is required"),
    services: Yup.object().shape({
      serviceType: Yup.string().required("Please select the type of service"),
      serviceStartDetails: Yup.string().required("Service start details are required"),
    }),
    clients: Yup.array()
      .of(
        Yup.object().shape({
          fullName: Yup.string().required("Client name is required"),
          gender: Yup.string().required("Gender is required"),
          birthDate: Yup.string().required("Birth date is required"),
          address: Yup.string().required("Address is required"),
          startDate: Yup.string().required("Start date is required"),
          clientInfo: Yup.string().required("Client info is required"),
          phone: Yup.string()
            .required("Phone number is required")
            .matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
          email: Yup.string()
            .required("Email is required")
            .email("Invalid email address"),
        })
      )
      .min(1, "At least one client is required"),
    billingInfo: Yup.object().shape({
      invoiceEmail: Yup.string()
        .required("Invoice email is required")
        .email("Invalid email"),
    }),
    // removed the old parentInfo validation because we're now using parentInfoList
  });

  // custom validate function (kept as before but you can add per-list validation)
  const validate = (values) => {
    const errors = {};

    if (showTransportation) {
      const t = values.transportation || {};
      const tErr = {};
      if (!t.pickupAddress) tErr.pickupAddress = "Pickup address is required";
      if (!t.dropoffAddress) tErr.dropoffAddress = "Dropoff address is required";
      if (!t.pickupTime) tErr.pickupTime = "Pickup time is required";
      if (!t.dropOffTime) tErr.dropOffTime = "Drop off time is required";
      if (Object.keys(tErr).length > 0) errors.transportation = tErr;
    }

    if (showVisitation) {
      const v = values.supervisedVisitation || {};
      const vErr = {};
      if (!v.visitStartTime) vErr.visitStartTime = "Visit start time is required";
      if (!v.visitEndTime) vErr.visitEndTime = "Visit end time is required";
      if (!v.visitDuration) vErr.visitDuration = "Visit duration is required";
      if (Object.keys(vErr).length > 0) errors.supervisedVisitation = vErr;
    }

    return errors;
  };

  // ✅ Changes: handleSubmit updated to upload signature (from sigCanvas) to Firebase Storage
  const handleSubmit = async (values, { resetForm }) => {
    try {
      console.log("Form Values:", values);
      let uploadedDocs = [];
      let uploadedMedicalDocs = [];

      // Upload docs if any (same as before)
      if (values.uploadDocs && values.uploadDocs.length > 0) {
        uploadedDocs = await Promise.all(
          values.uploadDocs.map(async (file) => {
            const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return { fileName: file.name, fileUrl: url };
          })
        );
      }

      if (values.uploadMedicalDocs && values.uploadMedicalDocs.length > 0) {
        uploadedMedicalDocs = await Promise.all(
          values.uploadMedicalDocs.map(async (file) => {
            const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return { fileName: file.name, fileUrl: url };
          })
        );
      }

      // ✅ Upload signature if present on the signature pad
      let signatureURL = null;
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const dataURL = sigCanvas.current.toDataURL("image/png");
        // convert base64 to blob
        const res = await fetch(dataURL);
        const blob = await res.blob();
        const uniqueId = `form_${Date.now()}`;
        const signatureRef = ref(storage, `signatures/${uniqueId}.png`);
        await uploadBytes(signatureRef, blob);
        signatureURL = await getDownloadURL(signatureRef);
      }

      // Convert clients array -> client1, client2, ...
      const clientsObj = {};
      values.clients.forEach((client, idx) => {
        clientsObj[`client${idx + 1}`] = client;
      });

      // Prepare final data structure and include new lists
      const formData = {
        name: values.name,
        dateOfIntake: values.dateOfIntake,
        services: values.services,
        clients: clientsObj,
        clientsArray: values.clients, // keep array too
        billingInfo: values.billingInfo,
        parentInfoList: values.parentInfoList || [],
        medicalInfoList: values.medicalInfoList || [],
        transportationInfoList: values.transportationInfoList || [],
        transportation: showTransportation ? values.transportation : null,
        supervisedVisitation: showVisitation ? values.supervisedVisitation : null,
        uploadedDocs,
        uploadedMedicalDocs,
        signatureURL,
        createdAt: new Date(),
      };

      
          if (mode === "update" && id) {
      const intakeRef = doc(db, "InTakeForms", id);
      await updateDoc(intakeRef, {
        ...formData,
        updatedAt: new Date(),
      });
      alert("✅ Intake Form updated successfully!");
    } else {
      const uniqueId = `form_${Date.now()}`;
      await setDoc(doc(db, "dev_InTakeForms", uniqueId), formData);
      alert("✅ Intake Form submitted successfully!");
    }


      alert("✅ Intake Form submitted successfully!");
      resetForm();
      setAvatarPreview(null);
      // clear signature canvas
      if (sigCanvas.current) sigCanvas.current.clear();
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      alert("Error submitting form, please try again!");
    }
  };


  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-bold text-2xl leading-7 text-light-black">
          {mode === "update" ? "Update Intake Form" : "Add Intake Form"}{" "}
          {isCaseWorker ? "(Intake Worker)" : "(Private Form)"}
        </p>

      </div>
      <hr className="border-t border-gray" /> 
          <Formik
          enableReinitialize
            initialValues={initialValues}
            // validate={validate}
     
            // validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ touched, errors, values, setFieldValue }) => (
              <Form className="flex flex-col gap-4 w-full ">
                {/* Avatar Section */}
                <div className="flex items-center gap-4 p-4 bg-white border border-light-gray rounded w-full">
                  <div className="flex bg-gray-200 h-[91px] w-[91px] rounded-full overflow-hidden items-center justify-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // <FaRegUserCircle className="h-23 w-23 text-light-black"/>
                      <img src="/images/profile.jpeg" />

                    )}
                  </div>
    
                  {/* Buttons */}
                  <div className="flex gap-3">
                    {/* Hidden file input */}
                    <input
                      id="avatarInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleAvatarChange(event, setFieldValue)}
                    />
    
                    {/* Change Avatar */}
                    <label
                      htmlFor="avatarInput"
                      className="text-light-green px-3 py-[6px] rounded-sm border-2 border-dark-green font-medium text-sm leading-5 tracking-normal cursor-pointer bg-dark-green text-white"
                    >
                      Change Avatar
                    </label>
    
                    {/* Remove Avatar */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAvatar(setFieldValue)}
                      className="text-light-green px-3 py-[6px] rounded-sm border-2 border-light-green font-medium text-sm leading-5 tracking-normal "
                    >
                      Remove Avatar
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 ">
                   <div className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
                      onClick={() => setShowTransportation((prev) => !prev)}
                    >
                    <p className="w-[10px] ">{!showTransportation ?<FaPlus />:<FaMinus/>}</p>
                     <p className="font-medium text-[14px] leading-[20px] ">{!showTransportation ? "Add":"Remove"} Transportation</p>
                    </div>
                    <div className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
                        onClick={() =>setShowVisitation((prev) => !prev) }
                    >
                        <p className="w-[10px] ">{!showVisitation ?<FaPlus />:<FaMinus/>}</p>
                       <p className="font-medium text-[14px] leading-[20px] " >{!showVisitation ? "Add" :"Remove"} Supervised Visitation</p>
                     </div>

                </div>

    
                {/* Form Fields */}
                <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                    <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Name
                        </label>
                        <Field
                            name="name"
                            type="text"
                            placeholder="Please enter the name of client"
                            className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                             touched.name && errors.name ? "border-red-500" : "border-light-gray"
                             }`}
                         />

                    </div>
                    <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Date of Intake
                        </label>
                        <Field
                            name="dateOfIntake"
                            type="text"
                            placeholder="Please enter the date of Intake(DD-MM-YYYY)"
                            className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                             touched.dateOfIntake && errors.dateOfIntake ? "border-red-500" : "border-light-gray"
                             }`}
                         />
                    </div>
                    
                </div>
                {/* ///////////////////////////////////////////////////////////// */}
                <div className="">
                <h3 className="font-bold text-[24px] text-light-black ">Services</h3>
                <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                    <div className="relative">
                      <label
                        htmlFor="shiftCategory"
                        className="font-bold text-sm leading-5 tracking-normal text-light-black"
                      >
                        Types of Services
                      </label>

                      <Field
                        as="select"
                        name="serviceType"
                        className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                          ${touched.serviceType && errors.serviceType ? "border-red-500" : "border-light-gray"}
                          ${values.serviceType ? "text-black" : "text-[#72787E] text-sm"}
                        `}
                      >
                        <option value="" className="text-gray-400 text-sm">
                          Select the type of service
                        </option>

                        {shiftCategories.map((item) => (
                          <option key={item.id} value={item.id} className="text-black">
                            {item.name}
                          </option>
                        ))}
                      </Field>

                      {/* Custom Dropdown Arrow */}
                      <span className="absolute right-3 top-[45px] -translate-y-1/2 pointer-events-none">
                        <FaChevronDown className="text-light-green w-4 h-4" />
                      </span>

                      <ErrorMessage
                        name="serviceType"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />
                    </div>

                    <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Service Start Details
                        </label>
                        <Field
                            name="serviceStartDetails"
                            type="text"
                            placeholder="Please enter start date of service"
                            className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                             touched.serviceStartDetails && errors.serviceStartDetails ? "border-red-500" : "border-light-gray"
                             }`}
                         />

                    </div>
                  <div>
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                       Phone No
                      </label>
                      <Field
                        name="servicePhone"
                        type="text"
                        placeholder="Please enter the phone no"
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                        touched.servicePhone && errors.servicePhone ? "border-red-500" : "border-light-gray"
                    }`}
                   />
                  <ErrorMessage
                  name="servicePhone"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                  />
              </div>
                    <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          E-Mail
                        </label>
                        <Field
                          name="serviceEmail"
                          type="email"
                          placeholder="Please enter the e-mail ID"
                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                           touched.serviceEmail && errors.serviceEmail ? "border-red-500" : "border-light-gray"
                         }`}
                        />
                        <ErrorMessage
                            name="serviceEmail"
                            component="div"
                            className="text-red-500 text-xs mt-1"
                        />
                    </div>
                   
                  <div className="col-span-3">
                    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                      Safety Plan/Management Risk
                    </label>
                    <Field
                      as="textarea"
                      name="safetyPlan"
                      placeholder="Write down any risk or safety plan required for the plan"
                      className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50 ${
                        touched.safetyPlan && errors.safetyPlan
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    />
                    <ErrorMessage
                      name="safetyPlan"
                      component="div"
                      className="text-red-500 text-xs mt-1"
                    />
                  </div>
                   <div className="col-span-3">
  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
    Service Description
  </label>

  <Field
    as="textarea"
    name="serviceDesc"
    placeholder="Write down the details regarding the service"
    className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50"
  />
</div>

                    
                    
                </div>
                </div>
                {/* /////////////////////////////////////////////////////////////////////////////////////// */}
                <div>
                  {/* === CLIENT INFO (with Add Sibling) === */}
            <div>
              <div className="flex justify-between items-center ">
                <h3 className="font-bold text-[24px] text-light-black">Client Info</h3>
                <button
                  type="button"
                  onClick={() => {
                    setFieldValue("clients", [
                      ...values.clients,
                      {
                        fullName: "",
                        gender: "",
                        birthDate: "",
                        address: "",
                        startDate: "",
                        clientInfo: "",
                      },
                    ]);
                  }}
                  className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                >
                  + Add Sibling
                </button>
              </div>

              <FieldArray name="clients">
                {({ remove }) => (
                  <div className="flex flex-col gap-6">
                    {values.clients.map((client, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 border border-light-gray rounded relative w-full"
                      >
                        {/* Heading with Remove button */}
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-lg text-light-black">
                            Client {index + 1}
                          </h4>
                          {values.clients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-500 font-semibold"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {/* Fields Grid */}
                        <div className="grid grid-cols-3 gap-8 gap-y-4">
                          {/* Full Name */}
                          <div>
                            <label className="font-bold text-sm text-light-black">
                              Full Name
                            </label>
                            <Field
                              name={`clients.${index}.fullName`}
                              type="text"
                              placeholder="Enter client name"
                              className={`w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E]  placeholder:text-sm placeholder:font-normal ${
                                touched.clients?.[index]?.fullName &&
                                errors.clients?.[index]?.fullName
                                  ? "border-red-500"
                                  : "border-light-gray"
                              }`}
                            />
                            <ErrorMessage
                              name={`clients.${index}.fullName`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>

                          {/* Gender */}
                         <div className="relative">
                        <label className="font-bold text-sm text-light-black">
                          Gender
                        </label>

                        <Field
                          as="select"
                          name={`clients.${index}.gender`}
                          className={`w-full border rounded-sm p-[10px] appearance-none pr-10 text-sm
                            ${values?.clients?.[index]?.gender ? "text-black" : "text-[#72787E]"}
                            border-light-gray
                          `}
                        >
                          <option value="" className="text-[#72787E] text-sm">
                            Select Gender
                          </option>
                          <option value="male" className="text-black text-sm">Male</option>
                          <option value="female" className="text-black text-sm">Female</option>
                          <option value="other" className="text-black text-sm">Other</option>
                        </Field>

                        <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-light-green w-4 h-4" />
                        </span>
                      </div>


                          {/* Birth Date */}
                          <div>
                            <label className="font-bold text-sm text-light-black">
                              Date of Birth
                            </label>
                            <Field
                              name={`clients.${index}.birthDate`}
                              type="date"
                              className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                            />
                          </div>

                          {/* Address */}
                          <div>
                            <label className="font-bold text-sm text-light-black">
                              Address
                            </label>
                            <Field
                              name={`clients.${index}.address`}
                              type="text"
                              placeholder="Enter client address"
                              className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                            />
                          </div>

                          {/* Start Date */}
                          <div>
                            <label className="font-bold text-sm text-light-black">
                              Service Start Date
                            </label>
                            <Field
                              name={`clients.${index}.startDate`}
                              type="date"
                              className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                            />
                          </div>

                          {/* Client Info */}
                          <div className="col-span-3">
                            <label className="font-bold text-sm text-light-black">
                              Client Info
                            </label>
                            <Field
                              as="textarea"
                              name="clientInfo"
                              placeholder="Write down any risk or safety plan required for the plan"
                              className={"w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50"}
                              
                            />
                            
                          </div>

                          
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                    </FieldArray>
                  </div>              
              </div>
              {/* //////////////////////////////////////////////////////////////////////////////////// */}
              {isCaseWorker && <div>
              <h3 className="font-bold text-[24px] text-light-black">Case Worker Information</h3>
              <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                   {/* Name */}
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Name
                   </label>
                   <Field
                     name="intakeworkerName"
                     type="text"
                     placeholder="Please enter the name of case worker "
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.intakeworkerName && errors.intakeworkerName ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="intakeworkerName "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div> 
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Name of Agency/Organisation
                   </label>
                   <Field
                     name="agencyName"
                     type="text"
                     placeholder="Please enter the name of agency/organisation"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.agencyName && errors.agencyName ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="agencyName "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div> 
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Phone Number
                   </label>
                   <Field
                     name="intakeworkerPhone"
                     type="text"
                     placeholder="Please enter the phone number"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.intakeworkerPhone && errors.intakeworkerPhone ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="intakeworkerPhone "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div> 
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     E-mail
                   </label>
                   <Field
                     name="intakeworkerEmail"
                     type="text"
                     placeholder="Please enter the e-mail of case worker"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.intakeworkerEmail && errors.intakeworkerEmail ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="intakeworkerEmail "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div>                                
              </div>
              </div>}
              {/* ///////////////////////////////////////////////////////////////////////////////////////// */}
              {isCaseWorker && <div>
              <h3 className="font-bold text-[24px] text-light-black">Intake Worker Information</h3>
              <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                   {/* Name */}
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Name
                   </label>
                   <Field
                     name="intakeworkerName"
                     type="text"
                     placeholder="Please enter the name of intake worker "
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.intakeworkerName && errors.intakeworkerName ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="intakeworkerName "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div> 
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Name of Agency/Organisation
                   </label>
                   <Field
                     name="agencyName"
                     type="text"
                     placeholder="Please enter the name of agency/organisation"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.agencyName && errors.agencyName ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="agencyName "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div> 
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Phone Number
                   </label>
                   <Field
                     name="intakeworkerPhone"
                     type="text"
                     placeholder="Please enter the phone number"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.intakeworkerPhone && errors.intakeworkerPhone ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="intakeworkerPhone "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div> 
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     E-mail
                   </label>
                   <Field
                     name="intakeworkerEmail"
                     type="text"
                     placeholder="Please enter the e-mail of intake worker"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.intakeworkerEmail && errors.intakeworkerEmail ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="intakeworkerEmail "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div>                                
              </div>
              </div>}

                         {/* /////////////////////////////////////////////////////////////////////// */}
 {/* ✅ Parent Info Section */}
<div className="">
  <div className="flex justify-between items-center ">
    <h3 className="font-bold text-[24px] text-light-black">Parent Info</h3>
    <button
      type="button"
      onClick={() => {
        setFieldValue("parentInfoList", [
          ...values.parentInfoList,
          {
            clientName: "",
            parentName: "",
            relationShip: "",
            parentPhone: "",
            parentEmail: "",
            parentAddress: "",
          },
        ]);
      }}
      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
    >
      + Add Parent Info
    </button>
  </div>

  <FieldArray name="parentInfoList">
    {({ remove }) => (
      <div className="flex flex-col gap-6">
        {values.parentInfoList.map((parent, index) => (
          <div
            key={index}
            className="bg-white p-4 border border-light-gray rounded relative w-full"
          >
            {/* Heading with Remove button */}
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-light-black">
                Parent {index + 1}
              </h4>
              {values.parentInfoList.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 font-semibold"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-8 gap-y-4">
              {/* Client Name */}
             <div className="relative">
  <label className="font-bold text-sm text-light-black">
    Client Name
  </label>

  <Field
    as="select"
    name={`parentInfoList.${index}.clientName`}
    value={values.parentInfoList[index].clientName}
    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
      ${
        values.parentInfoList[index].clientName
          ? "text-black"
          : "text-[#72787E] text-sm"
      } border-light-gray`}
  >
    <option value="" className="text-gray-400">
      Select Client
    </option>

    {values.clients.map((client, i) => (
      <option key={i} value={client.fullName} className="text-black">
        {client.fullName}
      </option>
    ))}
  </Field>

  {/* Custom Arrow */}
  <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
    <FaChevronDown className="text-light-green w-4 h-4" />
  </span>
</div>


              <div>
                <label className="font-bold text-sm text-light-black">
                  Parent Name
                </label>
                <Field
                  name={`parentInfoList.${index}.parentName`}
                  type="text"
                  placeholder="Enter parent name"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Relationship
                </label>
                <Field
                  name={`parentInfoList.${index}.relationShip`}
                  type="text"
                  placeholder="e.g. Father, Mother"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Phone
                </label>
                <Field
                  name={`parentInfoList.${index}.parentPhone`}
                  type="text"
                  placeholder="Enter Parent's phone number"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Email
                </label>
                <Field
                  name={`parentInfoList.${index}.parentEmail`}
                  type="email"
                  placeholder="Enter Parent's email"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div className="col-span-3">
                <label className="font-bold text-sm text-light-black">
                  Address
                </label>
                <Field
                  name={`parentInfoList.${index}.parentAddress`}
                  type="text"
                  placeholder="Enter address"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </FieldArray>
</div>


              {/* ////////////////////////////////////////////////////////////////////////////////// */}
              <div>
              <h3 className="font-bold text-[24px] text-light-black">Billing Information</h3>
              <div className="grid grid-cols-2 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                   {/* Name */}
                 <div>
                   <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                     Invoice E-mail
                   </label>
                   <Field
                     name="invoiceEmail"
                     type="text"
                     placeholder="Please enter the email for invoices"
                     className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                       touched.invoiceEmail && errors.invoiceEmail ? "border-red-500" : "border-light-gray"
                     }`}
                   />
                   <ErrorMessage
                     name="invoiceEmail "
                     component="div"
                     className="text-red-500 text-xs mt-1"
                   />
                 </div>                                
              </div>
              </div>
              {/* //////////////////////////////////////////////////////////// */}
<div>
  <h3 className="font-bold text-[24px] text-light-black">Upload Documents</h3>
  <div className="grid grid-cols-2 gap-16  bg-white p-4 border border-light-gray w-full rounded">
    <div>
      <label
        htmlFor="uploadDocs"
        className="font-bold text-sm leading-5 tracking-normal text-light-black"
      >
        Upload Documents
      </label>

      <div className="relative w-full">
        {/* Display number of selected files */}
        <input
          type="text"
          name="uploadDocs"
          value={
            values.uploadDocs.length > 0
              ? `${values.uploadDocs.length} file(s) selected`
              : ""
          }
          readOnly
          placeholder="Please upload documents regarding the client"
          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal pr-10 ${
            touched.uploadDocs && errors.uploadDocs
              ? "border-red-500"
              : "border-light-gray"
          }`}
        />

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files);
            const updatedFiles = [...values.uploadDocs, ...files];
            setFieldValue("uploadDocs", updatedFiles);
          }}
        />

        {/* Upload Icon Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-blue-600"
        >
          <Upload size={20} />
        </button>
      </div>

      {/* Error Message */}
      <ErrorMessage
        name="uploadDocs"
        component="div"
        className="text-red-500 text-xs mt-1"
      />

      {/* Show selected files */}
      {values.uploadDocs.length > 0 && (
        <div className="mt-3 border rounded p-2 bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">Selected Files:</h4>
          <ul className="space-y-1">
            {values.uploadDocs.map((file, index) => (
              <li
                key={index}
                className="flex justify-between items-center bg-white border p-2 rounded shadow-sm"
              >
                <span className="text-sm truncate max-w-[70%]">{file.name}</span>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    const updatedFiles = values.uploadDocs.filter(
                      (_, i) => i !== index
                    );
                    setFieldValue("uploadDocs", updatedFiles);
                  }}
                >
                  <X size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
</div>


 
                             
                                 
              
              {/* ////////////////////////////////////////////////////////////////////////////////// */}
             {/* ✅ Medical Info Section */}
<div className="">
  <div className="flex justify-between items-center ">
    <h3 className="font-bold text-[24px] text-light-black">Medical Info</h3>
    <button
      type="button"
      onClick={() => {
        setFieldValue("medicalInfoList", [
          ...values.medicalInfoList,
          {
            clientName: "",
            healthCareNo: "",
            diagnosis: "",
            diagnosisType: "",
            medicalConcern: "",
            mobilityAssistance: "",
            mobilityInfo: "",
            communicationAid: "",
            communicationInfo: "",
          },
        ]);
      }}
      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
    >
      + Add Medical Info
    </button>
  </div>

  <FieldArray name="medicalInfoList">
    {({ remove }) => (
      <div className="flex flex-col gap-6">
        {values.medicalInfoList.map((medical, index) => (
          <div
            key={index}
            className="bg-white p-4 border border-light-gray rounded relative w-full"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-light-black">
                Medical Info {index + 1}
              </h4>
              {values.medicalInfoList.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 font-semibold"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-8 gap-y-4">
             <div className="relative">
  <label className="font-bold text-sm text-light-black">
    Client Name
  </label>

  <Field
    as="select"
    name={`medicalInfoList.${index}.clientName`}
    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
      ${
        values.medicalInfoList[index].clientName
          ? "text-black"
          : "text-[#72787E] text-sm"
      } border-light-gray`}
  >
    <option value="" className="text-sm text-gray-400">
      Select Client
    </option>

    {values.clients.map((client, i) => (
      <option key={i} value={client.fullName} className="text-black">
        {client.fullName || `Client ${i + 1}`}
      </option>
    ))}
  </Field>

  {/* Custom dropdown arrow */}
  <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
    <FaChevronDown className="text-light-green w-4 h-4" />
  </span>
</div>


              <div>
                <label className="font-bold text-sm text-light-black">
                  Health Care No.
                </label>
                <Field
                  name={`medicalInfoList.${index}.healthCareNo`}
                  type="text"
                  placeholder="Enter health care no"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Diagnosis
                </label>
                <Field
                  name={`medicalInfoList.${index}.diagnosis`}
                  type="text"
                  placeholder="Enter diagnosis"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Diagnosis Type
                </label>
                <Field
                  name={`medicalInfoList.${index}.diagnosisType`}
                  type="text"
                  placeholder="Enter Type of Diagnosis"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div className="col-span-3">
                <label className="font-bold text-sm text-light-black">
                  Medical Concern
                </label>
                <Field
                  as="textarea"
                  name={`medicalInfoList.${index}.medicalConcern`}
                  placeholder="Enter Medical concerns"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Mobility Assistance
                </label>
                <Field
                  name={`medicalInfoList.${index}.mobilityAssistance`}
                  type="text"
                  placeholder="Yes/No"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Mobility Info
                </label>
                <Field
                  name={`medicalInfoList.${index}.mobilityInfo`}
                  type="text"
                  placeholder="Enter details"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Communication Aid
                </label>
                <Field
                  name={`medicalInfoList.${index}.communicationAid`}
                  type="text"
                  placeholder="Yes/No"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div className="col-span-3">
                <label className="font-bold text-sm text-light-black">
                  Communication Info
                </label>
                <Field
                  as="textarea"
                  name={`medicalInfoList.${index}.communicationInfo`}
                  placeholder="Enter communication details"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </FieldArray>
</div>

                  {/* ///////////////////////////////////////////////////////////////// */}
    {showTransportation && 
              
<div className="">
  <div className="flex justify-between items-center ">
    <h3 className="font-bold text-[24px] text-light-black">Transportation Info</h3>
    <button
      type="button"
      onClick={() => {
        setFieldValue("transportationInfoList", [
          ...values.transportationInfoList,
          {
            clientName: "",
            pickupAddress: "",
            dropoffAddress: "",
            pickupTime: "",
            dropOffTime: "",
            transportationOverview: "",
          },
        ]);
      }}
      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
    >
      + Add Transportation Info
    </button>
  </div>

  <FieldArray name="transportationInfoList">
    {({ remove }) => (
      <div className="flex flex-col gap-6">
        {values.transportationInfoList.map((trans, index) => (
          <div
            key={index}
            className="bg-white p-4 border border-light-gray rounded relative w-full"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-light-black">
                Transportation {index + 1}
              </h4>
              {values.transportationInfoList.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 font-semibold"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-8 gap-y-4">
              <div className="relative">
  <label className="font-bold text-sm text-light-black">
    Client Name
  </label>

  <Field
    as="select"
    name={`transportationInfoList.${index}.clientName`}
    className={`w-full border rounded-sm p-[10px] appearance-none pr-10
      ${
        values.transportationInfoList[index].clientName
          ? "text-black"
          : "text-[#72787E] text-sm"
      } border-light-gray`}
  >
    <option value="" className="text-sm text-gray-400">
      Select Client
    </option>

    {values.clients.map((client, i) => (
      <option key={i} value={client.fullName} className="text-black">
        {client.fullName || `Client ${i + 1}`}
      </option>
    ))}
  </Field>

  {/* Custom dropdown arrow */}
  <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
    <FaChevronDown className="text-light-green w-4 h-4" />
  </span>
</div>


              <div>
                <label className="font-bold text-sm text-light-black">
                  Pickup Address
                </label>
                <Field
                  name={`transportationInfoList.${index}.pickupAddress`}
                  type="text"
                  placeholder="Enter pickup address"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Dropoff Address
                </label>
                <Field
                  name={`transportationInfoList.${index}.dropoffAddress`}
                  type="text"
                  placeholder="Enter dropoff address"
                  className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Pickup Time
                </label>
                <Field
                  name={`transportationInfoList.${index}.pickupTime`}
                  type="time"
                  className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-sm text-light-black">
                  Dropoff Time
                </label>
                <Field
                  name={`transportationInfoList.${index}.dropOffTime`}
                  type="time"
                  className="w-full border border-light-gray rounded-sm p-[10px]"
                />
              </div>

               <div>
                <label className="font-bold text-sm text-light-black">
                 Car Seat Type
                </label>
                <Field
                  name={`transportationInfoList.${index}.carSeatType`}
                  type="text"
                  placeholder="Enter type of car seat required"
                  className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-sm"
                />
              </div>

              <div className="col-span-3">
                <label className="font-bold text-sm text-light-black">
                  Transportation Overview
                </label>
                <Field
                  as="textarea"
                  name={`transportationInfoList.${index}.transportationOverview`}
                  placeholder="Add transportation Overview"
                  className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </FieldArray>
</div>



              }
{/* ////////////////////////////////////////////////////////////////////////////////////// */}
              
  {showVisitation && 
<div className="">
  <div className="flex justify-between items-center ">
    <h3 className="font-bold text-[24px] text-light-black">Supervised Visitations</h3>
    <button
      type="button"
      onClick={() => {
        setFieldValue("supervisedVisitations", [
          ...values.supervisedVisitations,
          {
            clientName: "",
            visitStartTime: "",
            visitEndTime: "",
            visitDuration: "",
            visitPurpose: "",
            visitAddress: "",
            visitOverview: "",
          },
        ]);
      }}
      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
    >
      + Add Supervised Visitation
    </button>
  </div>

  <FieldArray name="supervisedVisitations">
    {({ remove }) => (
      <div className="flex flex-col gap-6">
        {values.supervisedVisitations.map((visit, index) => (
          <div
            key={index}
            className="bg-white p-4 border border-light-gray rounded relative w-full"
          >
            {/* Section Header */}
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-light-black">
                Supervised Visitation {index + 1}
              </h4>
              {values.supervisedVisitations.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 font-semibold"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-3 gap-8 gap-y-4">
              {/* Client Name */}
              <div className="relative">
                <label className="font-bold text-sm text-light-black">
                  Client Name
                </label>

                <Field
                  as="select"
                  name={`supervisedVisitations.${index}.clientName`}
                  className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                    ${
                      values.supervisedVisitations[index].clientName
                        ? "text-black"
                        : "text-[#72787E] text-sm"
                    } border-light-gray`}
                >
                  <option value="" className="text-sm text-gray-400">
                    Select Client
                  </option>

                  {values.clients.map((client, i) => (
                    <option key={i} value={client.fullName || client.name}>
                      {client.fullName || client.name || `Client ${i + 1}`}
                    </option>
                  ))}
                </Field>

                <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                  <FaChevronDown className="text-light-green w-4 h-4" />
                </span>
              </div>



              {/* Visit Start Time */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Visit Start Time
                </label>
                <Field
                  name={`supervisedVisitations.${index}.visitStartTime`}
                  type="time"
                  className="w-full border border-light-gray rounded-sm p-[10px]"
                />
              </div>

              {/* Visit End Time */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Visit End Time
                </label>
                <Field
                  name={`supervisedVisitations.${index}.visitEndTime`}
                  type="time"
                  className="w-full border border-light-gray rounded-sm p-[10px]"
                />
              </div>

              {/* Visit Duration */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Visit Duration
                </label>
                <Field
                  name={`supervisedVisitations.${index}.visitDuration`}
                  type="text"
                  placeholder="Enter visit duration"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              {/* Purpose of Visit */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Purpose of Visit
                </label>
                <Field
                  name={`supervisedVisitations.${index}.visitPurpose`}
                  type="text"
                  placeholder="Enter purpose of visit"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              {/* Visit Address */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Visit Address
                </label>
                <Field
                  name={`supervisedVisitations.${index}.visitAddress`}
                  type="text"
                  placeholder="Enter visit address"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>

              {/* Visit Overview */}
              <div className="col-span-3">
                <label className="font-bold text-sm text-light-black">
                  Visit Overview
                </label>
                <Field
                  as="textarea"
                  name={`supervisedVisitations.${index}.visitOverview`}
                  placeholder="Write down the visit overview"
                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </FieldArray>
</div>

}
  
{/* ///////////////////////////////////////// */}
  <div>
  <h3 className="font-bold text-[24px] text-light-black">Acknowledgement</h3>
  <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
    <div>
      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">{isCaseWorker ? "Worker Name":"Parent/Guardian Name"}</label>
      <Field name="workerInfo.workerName" type="text" placeholder="Enter the name of person filling out the form" className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm" />
    </div>

    <div>
      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Date</label>
      <Field name="workerInfo.date" type="text" placeholder="Please enter the current date(DD-MM-YYY)" className="w-full border rounded-sm p-[10px] border-light-gray placeholder:text-sm" />
    </div>

    <div className="col-span-3">
      <label className="font-bold text-sm leading-5 tracking-normal text-light-black ">{isCaseWorker ? "Worker Signature":"Parent/Guardian Signature"}</label>

      <div className="border rounded-sm mt-1 relative border-light-gray ">
        {/* Use onEnd to capture the signature and write to Formik workerInfo.signature */}
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          backgroundColor="#ffffff"
          canvasProps={{
            width: 400,
            height: 120,
            className: "rounded-md",
          }}
          minWidth={0.4}
          maxWidth={1.0}
          velocityFilterWeight={0.7}
          onEnd={() => {
            // store base64 in the workerInfo.signature Formik field
            const dataURL = sigCanvas.current?.toDataURL("image/png") || "";
            setFieldValue("workerInfo.signature", dataURL);
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (sigCanvas.current) sigCanvas.current.clear();
            setFieldValue("workerInfo.signature", "");
          }}
          className="absolute top-1 right-1 px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear
        </button>
      </div>

      <ErrorMessage name="workerInfo.signature" component="div" className="text-red-500 text-xs mt-1" />
    </div>
  </div>
</div>



               {/* Submit Button */}
              <div className="col-span-2 flex justify-center">
                <button
                  type="submit"
                  className="bg-dark-green text-white px-6 py-2 rounded "
                >
                  Submit Intake Form
                </button>
              </div>
             
             
                 
              </Form>
            )}
          </Formik>
        </div>
  )
}

export default IntakeForm
