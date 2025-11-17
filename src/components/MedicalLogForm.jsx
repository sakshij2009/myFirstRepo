import React, { useEffect, useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const validationSchema = Yup.object({
  dateOfContact: Yup.date().required("Please provide date of contact"),
  timeOfContact: Yup.string().required("Please provide time of contact"),
  personContacted: Yup.string().required("Please provide person contacted"),
  details: Yup.string().required("Details are required"),
  followUp: Yup.string().required("Follow-up information is required"),
  employeeSignature: Yup.string().required("Signature is required"),
});

const MedicalLogForm = ({ clientData = {}, shiftId, onCancel, onSuccess }) => {
  const formType = "contactLogEvent";
  const draftKey = `${formType}_draft_${shiftId}`;

  // ✅ 1. Define all fields (fully controlled)
  const [initialValues, setInitialValues] = useState({
    clientName: clientData?.clientName || "",
    staffName: clientData?.username || "",
    personContacted: "",
    dateOfContact: "",
    timeOfContact: "",
    program: [],
    typeOfContact: [],
    details: "",
    followUp: "",
    employeeSignature: "",
    date: "",
  });

  // ✅ 2. Load saved draft safely
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      const restored = JSON.parse(savedDraft);
      setInitialValues((prev) => ({
        ...prev,
        ...restored,
        program: Array.isArray(restored.program) ? restored.program : [],
        typeOfContact: Array.isArray(restored.typeOfContact)
          ? restored.typeOfContact
          : [],
      }));
    }
  }, [draftKey]);

  // ✅ 3. Save draft locally
  const handleSaveDraft = (values) => {
    localStorage.setItem(draftKey, JSON.stringify(values));
    alert("Draft saved locally!");
  };

  // ✅ 4. Submit & attach inside existing shift doc
  const handleSubmit = async (values, { resetForm }) => {
  try {
    const data = {
      ...values,
      submittedAt: serverTimestamp(),
    };

    // ✅ Correct — merge new form data inside existing shift
    const shiftRef = doc(db, "shifts", shiftId);
    await setDoc(shiftRef, { [formType]: data }, { merge: true });

    localStorage.removeItem(draftKey);
    alert("Form submitted successfully!");
    resetForm();
    onSuccess && onSuccess();
  } catch (error) {
    console.error("Error submitting form:", error);
    alert("Failed to submit the form. Try again.");
  }
};


  return (
    <div className="flex flex-col p-6 bg-white rounded text-light-black gap-4">
      {/* Header */}
      <div className="flex gap-4 justify-between">
        <div className="flex gap-4">
          <img src="/images/jam_triangle-contact.png" alt="" className="w-[52px]" />
          <div>
            <h1 className="font-bold text-[28px] leading-[32px]">
              Medical Contact Log
            </h1>
            <p className="font-normal text-[14px] leading-[20px]">
              Complete all sections thoroughly - This report is confidential and
              protected
            </p>
          </div>
        </div>
        <div>
          <p
            className="text-light-green border border-light-green py-[6px] px-3 font-medium text-[14px] leading-[20px] rounded cursor-pointer"
            onClick={() => {
              try {
                onCancel && onCancel();
              } catch (err) {
                console.warn("onCancel callback threw:", err);
              }
            }}
          >
            Cancel
          </p>
        </div>
      </div>

      <div>
        <hr className="border-t border-[#E6E6E6]" />
      </div>

      {/* ✅ Formik Form */}
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, values, setFieldValue }) => (
          <Form className="flex flex-col gap-6">
            {/* Client Information */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold">
                Client Information <span className="text-red-500">*</span>
              </h2>

              <div className="flex flex-col border border-light-gray rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-16 rounded p-4">
                  <div>
                    <label className="font-bold text-sm">Client Name</label>
                    <Field
                      name="clientName"
                      className="w-full border rounded p-2 mt-1 border-light-gray focus:outline-gray"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-sm text-gray-800">
                      Date of Contact
                    </label>
                    <Field
                      type="date"
                      name="dateOfContact"
                      className={`w-full border rounded p-2 mt-1 focus:outline-gray ${
                        errors.dateOfContact && touched.dateOfContact
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-sm text-gray-800">
                      Person Contacted
                    </label>
                    <Field
                      name="personContacted"
                      placeholder="Enter person contacted"
                      className={`w-full border rounded p-2 mt-1 focus:outline-gray ${
                        errors.personContacted && touched.personContacted
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-sm text-gray-800">
                      Time of Contact
                    </label>
                    <Field
                      name="timeOfContact"
                      type="time"
                      className={`w-full border rounded-sm p-2 mt-1 focus:outline-gray ${
                        errors.timeOfContact && touched.timeOfContact
                          ? "border-red-500"
                          : "border-light-gray"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-sm text-gray-800">
                      Staff Name
                    </label>
                    <Field
                      name="staffName"
                      className="w-full border rounded-sm p-2 mt-1 border-light-gray"
                    />
                  </div>
                </div>

                {/* Program + Type of Contact */}
                <div className="flex p-4 gap-x-20">
                  <div>
                    <label className="font-bold text-sm">Program</label>
                    <div className="flex flex-col gap-1 mt-2">
                      {[
                        "Transportation",
                        "Supervised Visit",
                        "Respite-In Home",
                        "Respite- Out of Home",
                        "Emergency Care",
                      ].map((program) => (
                        <label
                          key={program}
                          className="text-sm flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={values.program.includes(program)}
                            onChange={() => {
                              if (values.program.includes(program)) {
                                setFieldValue(
                                  "program",
                                  values.program.filter((p) => p !== program)
                                );
                              } else {
                                setFieldValue("program", [
                                  ...values.program,
                                  program,
                                ]);
                              }
                            }}
                          />
                          {program}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-sm">
                      Type of Contact
                    </label>
                    <div className="flex flex-col gap-1 mt-2">
                      {[
                        "Telephone",
                        "Face to Face",
                        "Professional",
                        "Significant Person/ Family",
                        "Other",
                      ].map((type) => (
                        <label
                          key={type}
                          className="text-sm flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={values.typeOfContact.includes(type)}
                            onChange={() => {
                              if (values.typeOfContact.includes(type)) {
                                setFieldValue(
                                  "typeOfContact",
                                  values.typeOfContact.filter((t) => t !== type)
                                );
                              } else {
                                setFieldValue("typeOfContact", [
                                  ...values.typeOfContact,
                                  type,
                                ]);
                              }
                            }}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold">
                Details <span className="text-red-500">*</span>
              </h2>
              <Field
                as="textarea"
                name="details"
                placeholder="Write down description of the incident"
                className={`w-full border rounded-sm p-3 h-32 focus:outline-none ${
                  errors.details && touched.details
                    ? "border-red-500"
                    : "border-light-gray"
                }`}
              />
              {errors.details && touched.details && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.details}
                </p>
              )}
            </div>

            {/* Follow-up */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold">
                Follow-up Required <span className="text-red-500">*</span>
              </h2>
              <Field
                as="textarea"
                name="followUp"
                placeholder="Write down follow-up actions required"
                className={`w-full border rounded-sm p-3 h-32 focus:outline-none ${
                  errors.followUp && touched.followUp
                    ? "border-red-500"
                    : "border-light-gray"
                }`}
              />
              {errors.followUp && touched.followUp && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.followUp}
                </p>
              )}
            </div>

            {/* Signature */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 rounded">
              <div>
                <label className="font-bold text-sm leading-[20px]">
                  Employee Signature
                </label>
                <Field
                  name="employeeSignature"
                  type="text"
                  placeholder="Enter employee name"
                  className={`w-full border rounded-sm p-2 mt-1 placeholder:text-sm placeholder:text-gray-500 ${
                    touched.employeeSignature && errors.employeeSignature
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {touched.employeeSignature && errors.employeeSignature && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.employeeSignature}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-sm leading-[20px]">Date</label>
                <Field
                  name="date"
                  type="date"
                  className={`w-full border rounded-sm p-2 mt-1 ${
                    touched.date && errors.date
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleSaveDraft(values)}
                className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-300"
              >
                Save Draft
              </button>
              <button
                type="submit"
                className="bg-purple-600 text-white font-semibold px-6 py-2 rounded hover:bg-purple-700"
              >
                Submit
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default MedicalLogForm;
