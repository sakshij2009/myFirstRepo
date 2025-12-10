import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import { getDocs, collection, doc, setDoc, getDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { FaRegUserCircle, FaChevronDown } from "react-icons/fa";
import SuccessSlider from "./SuccessSlider";
import { sendNotification } from "../utils/notificationHelper";
import { useParams } from "react-router-dom";


const AddAgency = ({  mode = "add", user }) => {

 const{id}=useParams();

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
    { name: "Administration", key: "administrationsBilling" },
    { name: "Transportation", key: "transportationsBilling" },
    { name: "Shadow Shift", key: "shadowShiftBilling" },
    { name: "Supervised Visitation",
      key: "supervisedVisitationsBilling"},
    {
      name: "Supervised Visitation + Transportation",
      key: "supervisedVisitationsTransportationBilling",
    },
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


  // if (mode === "update" && !initialValues) {
  //   return <p>Loading agency data...</p>;
  // }

  return (
    <div className="flex flex-col gap-4">
      <div>
         <p className="font-bold text-2xl leading-7 text-light-black">
           {mode === "update" ? "Update Agency" : "Add Agency"}
        </p>
      </div>
      <hr className="border-t border-gray" />
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
            rateList: serviceList.map(() => ({
              billingRate: "",
              kmRate: "",
            })),
          }
        }
        enableReinitialize
        validationSchema={mode=="add" ? validationSchema:""}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values, setFieldValue }) => (
          <Form className="flex flex-col gap-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-4 bg-white border border-light-gray rounded-sm">
              <div className="flex bg-gray-200 h-[91px] w-[91px] rounded-full overflow-hidden items-center justify-center">
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
                  onChange={(event) => handleAvatarChange(event, setFieldValue)}
                />
                <label
                  htmlFor="avatarInput"
                  className="text-light-green px-3 py-[6px] rounded-sm border-2 border-dark-green font-medium text-sm cursor-pointer bg-dark-green text-white"
                >
                  Change Logo
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveAvatar(setFieldValue)}
                  className="text-light-green px-3 py-[6px] rounded-sm border-2 border-light-green font-medium text-sm hover:bg-dark-green hover:text-white"
                >
                  Remove Logo
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4">
             
              {/* Agency type */}
            <div className="relative">
              <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                Agency Type
              </label>

              <Field
                as="select"
                name="agencyType"
                className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                  ${values.agencyType === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"}  
                  ${touched.agencyType && errors.agencyType ? "border-red-500" : "border-light-gray"}
                `}
              >
                <option value="">Select Agency Type</option>
                {agencyType.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </Field>

              {/* Custom dropdown arrow */}
              <span className="absolute right-3 top-[63%] -translate-y-1/2 pointer-events-none">
                <FaChevronDown className="text-light-green w-4 h-4" />
              </span>

              <ErrorMessage
                name="agencyType"
                component="div"
                className="text-red-500 text-xs mt-1"
              />
            </div>


              {/* File Name */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Agency Name
                </label>
                <Field
                  name="name"
                  type="text"
                  placeholder="Please enter a specific ID"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                    touched.name && errors.name
                      ? "border-red-500"
                      : "border-light-gray"
                  }`}
                />
                <ErrorMessage
                  name="name"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              {/* Email */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  E-Mail
                </label>
                <Field
                  name="email"
                  type="email"
                  placeholder="Please enter the email ID"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                    touched.email && errors.email
                      ? "border-red-500"
                      : "border-light-gray"
                  }`}
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="font-bold text-sm text-light-black">
                  Phone No
                </label>
                <Field
                  name="phone"
                  type="text"
                  placeholder="Please enter the phone number"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                    touched.phone && errors.phone
                      ? "border-red-500"
                      : "border-light-gray"
                  }`}
                />
                <ErrorMessage
                  name="phone"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              {/* Address */}
              <div className="">
                <label className="font-bold text-sm text-light-black">
                  Address
                </label>
                <Field
                  name="address"
                  type="text"
                  placeholder="Please enter the agency address"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-sm placeholder:text-[#72787E] ${
                    touched.address && errors.address
                      ? "border-red-500"
                      : "border-light-gray"
                  }`}
                />
                <ErrorMessage
                  name="address"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="font-bold text-sm text-light-black">
                  Description of Agency
                </label>
                <Field
                  as="textarea"
                  name="description"
                  placeholder="Write the description of the agency"
                  className={`w-full border rounded-sm p-[10px] h-32 placeholder:text-sm placeholder:text-[#72787E] ${
                    touched.description && errors.description
                      ? "border-red-500"
                      : "border-light-gray"
                  }`}
                />
                <ErrorMessage
                  name="description"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>
               {/* Agency Service Rates */}
            <div className="col-span-2">
              <h3 className="font-bold text-lg mb-4 text-light-black">Agency Service Rates</h3>
              <FieldArray name="rateList">
                {() => (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 text-light-black">
                    {serviceList.map((service, index) => (
                      <div
                        key={service.key}
                        className="border border-light-gray p-2 rounded-lg  "
                      >
                        <h3 className=" text-base font-bold text-[14px] leading-[20px]">
                          {service.name}
                        </h3>
                        <div className="flex gap-4 ">
                        {/* Billing Rate */}
                        <div className="w-1/2">
                          <label className="block text-sm font-medium mb-1">
                            Billing Rate
                          </label>
                          <Field
                            name={`rateList[${index}].billingRate`}
                            type="number"
                            placeholder="0.00"
                            className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E]"
                          />
                          <ErrorMessage
                            name={`rateList[${index}].billingRate`}
                            component="div"
                            className="text-red-500 text-xs mt-1"
                          />
                        </div>

                        {/* Kilometer Rate */}
                        <div className="w-1/2">
                          <label className="block text-sm font-medium mb-1">
                            Km Rate
                          </label>
                          <Field
                            name={`rateList[${index}].kmRate`}
                            type="number"
                            placeholder="0.00"
                            className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E]"
                          />
                          <ErrorMessage
                            name={`rateList[${index}].kmRate`}
                            component="div"
                            className="text-red-500 text-xs mt-1"
                          />
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FieldArray>
            </div>
             {/* Submit Button */}
            <div className="col-span-2 flex justify-center">
              <button
                type="submit"
                className="bg-dark-green text-white px-3 py-[6px] rounded-[6px] cursor-pointer"
              >
                {mode === "update" ? "Update Agency" : "Add Agency"}
              </button>
            </div>
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
          setSlider({ ...slider, show: false });
        }}
        onDismiss={() => setSlider({ ...slider, show: false })}
      />
    </div>
  );
};

export default AddAgency;
