import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import SuccessSlider from "../components/SuccessSlider";
import { FaChevronDown } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router-dom";

const AddIntakeWorker = ({ mode = "add" }) => {
  const navigate = useNavigate();
  const { id } = useParams(); // userId or unique identifier from ManageIntakeWorkers

  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",
    viewText: "",
  });

  const [initialValues, setInitialValues] = useState({
    name: "",
    role: "",
    agency: "",
    phone: "",
    email: "",
    invoiceEmail: "",
  });

  const UPCS_EMAIL_OPTIONS = ["billing@upcs.com", "accounts@upcs.com"];

  // Validation Schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    role: Yup.string().required("Role is required"),
    agency: Yup.string().when("role", {
      is: "Intake Worker",
      then: (schema) => schema.required("Agency name is required"),
      otherwise: (schema) => schema.notRequired(),
    }),
    phone: Yup.string()
      .matches(/^[0-9]{10}$/, "Must be 10 digits")
      .required("Phone number is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    invoiceEmail: Yup.string()
      .email("Invalid email")
      .required("Invoice email is required"),
  });

  // Fetch intake worker in update mode
  useEffect(() => {
    const fetchIntakeWorker = async () => {
      if (mode === "update" && id) {
        try {
          const q = query(collection(db, "intakeUsers"), where("email", "==", id));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const docData = snap.docs[0].data();
            setInitialValues({
              name: docData.name || "",
             role:
                docData.role?.toLowerCase().includes("intake")
                ? "Intake Worker"
                : docData.role?.toLowerCase().includes("parent")
                ? "Parent"
                : "",
              agency: docData.agency || "",
              phone: docData.phone || "",
              email: docData.email || "",
              invoiceEmail: docData.invoiceEmail || "",
            });
          } else {
            console.warn("⚠ No intake worker found with id:", id);
          }
        } catch (err) {
          console.error("Error fetching intake worker:", err);
        }
      }
    };

    fetchIntakeWorker();
  }, [mode, id]);

  // Handle Add or Update
  const handleSubmit = async (values, { resetForm }) => {
    try {
      if (mode === "update") {
        const q = query(collection(db, "intakeUsers"), where("email", "==", id));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docRef = doc(db, "intakeUsers", snap.docs[0].id);
          await updateDoc(docRef, {
            ...values,
            updatedAt: new Date(),
          });

          setSlider({
            show: true,
            title: "Intake Worker Updated Successfully!",
            subtitle: `${values.name} (${values.role})`,
            viewText: "View Intake Worker",
          });
        } else {
          alert("No matching intake worker found to update!");
        }
      } else {
        const q = query(collection(db, "intakeUsers"), where("email", "==", values.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("User already exists!");
          return;
        }

        await addDoc(collection(db, "intakeUsers"), {
          ...values,
          createdAt: new Date(),
        });

        setSlider({
          show: true,
          title: "Intake Worker Added Successfully!",
          subtitle: `${values.name} (${values.role})`,
          viewText: "View Intake Worker",
        });

        resetForm();
      }
    } catch (error) {
      console.error(error);
      setSlider({
        show: true,
        title: "Error Saving Intake Worker!",
        subtitle: "Please try again.",
        viewText: "",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="font-bold text-2xl leading-7 text-light-black">
          {mode === "update" ? "Update Intake Worker" : "Add Intake Worker"}
        </p>
      </div>
      <hr className="border-t border-gray" />

      {/* Formik Form */}
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values, setFieldValue }) => {
          const isUPCSAgency =
            values.agency?.trim().toLowerCase().startsWith("upcs") ?? false;

          return (
            <Form className="flex flex-col gap-4 ">
              <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4 border border-light-gray rounded-sm  ">

                {/* Name */}
                <div>
                  <label className="font-bold text-sm text-light-black">Full Name</label>
                  <Field
                    name="name"
                    type="text"
                    placeholder="Enter full name"
                    className={`w-full border rounded-sm p-[10px] placeholder:text-sm ${
                      touched.name && errors.name ? "border-red-500" : "border-light-gray"
                    }`}
                  />
                  <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Role */}
                <div className="relative">
                  <label className="font-bold text-sm text-light-black">Role</label>
                  <Field
                    as="select"
                    name="role"
                    className={`w-full border rounded-sm p-[10px] appearance-none pr-10 ${
                      touched.role && errors.role ? "border-red-500" : "border-light-gray"
                    }`}
                  >
                    <option value="">Select Role</option>
                    <option value="Intake Worker">Intake Worker</option>
                    <option value="Parent">Parent</option>
                  </Field>
                  <span className="absolute right-3 top-[65%] -translate-y-1/2 pointer-events-none">
                    <FaChevronDown className="text-light-green w-4 h-4" />
                  </span>
                  <ErrorMessage name="role" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Agency (conditional) */}
                {values.role === "Intake Worker" && (
                  <div>
                    <label className="font-bold text-sm text-light-black">
                      Name of Agency / Organisation
                    </label>
                    <Field
                      name="agency"
                      type="text"
                      placeholder="Enter agency name"
                      className={`w-full border rounded-sm p-[10px] placeholder:text-sm ${
                        touched.agency && errors.agency
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    />
                    <ErrorMessage
                      name="agency"
                      component="div"
                      className="text-red-500 text-xs mt-1"
                    />
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="font-bold text-sm text-light-black">Phone Number</label>
                  <Field
                    name="phone"
                    type="text"
                    placeholder="Enter phone number"
                    className={`w-full border rounded-sm p-[10px] placeholder:text-sm ${
                      touched.phone && errors.phone ? "border-red-500" : "border-light-gray"
                    }`}
                  />
                  <ErrorMessage name="phone" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Email */}
                <div>
                  <label className="font-bold text-sm text-light-black">E-mail</label>
                  <Field
                    name="email"
                    type="email"
                    placeholder="Enter email address"
                    className={`w-full border rounded-sm p-[10px] placeholder:text-sm ${
                      touched.email && errors.email ? "border-red-500" : "border-light-gray"
                    }`}
                    disabled={mode === "update"} // Prevent changing email in update
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Invoice Email */}
                <div>
                  <label className="font-bold text-sm text-light-black">Invoice Email</label>

                  {isUPCSAgency ? (
                    <Field
                      as="select"
                      name="invoiceEmail"
                      className={`w-full border rounded-sm p-[10px] appearance-none ${
                        touched.invoiceEmail && errors.invoiceEmail
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    >
                      <option value="">Select Invoice Email</option>
                      {UPCS_EMAIL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Field>
                  ) : (
                    <Field
                      name="invoiceEmail"
                      type="email"
                      placeholder="Enter invoice email"
                      className={`w-full border rounded-sm p-[10px] placeholder:text-sm ${
                        touched.invoiceEmail && errors.invoiceEmail
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    />
                  )}
                  <ErrorMessage
                    name="invoiceEmail"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Submit */}
                <div className="col-span-2 flex justify-center">
                  <button
                    type="submit"
                    className="bg-dark-green text-white px-6 py-2  mt-10 rounded cursor-pointer"
                  >
                    {mode === "update" ? "Update Intake Worker" : "Add Intake Worker"}
                  </button>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>

      <SuccessSlider
        show={slider.show}
        title={slider.title}
        subtitle={slider.subtitle}
        viewText={slider.viewText}
        onView={() => setSlider({ ...slider, show: false })}
        onDismiss={() => setSlider({ ...slider, show: false })}
      />
    </div>
  );
};

export default AddIntakeWorker;
