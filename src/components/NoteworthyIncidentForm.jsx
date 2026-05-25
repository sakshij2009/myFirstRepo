// src/components/NoteworthyIncidentForm.jsx
import React, { useEffect, useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const validationSchema = Yup.object({
  noteworthyEvent: Yup.string().required("Please describe the event"),
  employeeSignature: Yup.string().required("Employee Signature is required"),
  date: Yup.date().required("Date is required"),
});

const NoteworthyIncidentForm = ({
  clientData = {},
  shiftId,
  onCancel,
  onSuccess,
}) => {
  const formType = "noteworthyEvent";
  const draftKey = `${formType}_draft_${shiftId ?? "no-shift"}`;

  // Ensure all keys exist (controlled inputs)
  const [initialValues, setInitialValues] = useState({
    clientName: clientData?.clientName || "",
    clientId: clientData?.clientId || "",
    staffName: clientData?.username || clientData?.staffName || "",
    noteworthyEvent: "",
    employeeSignature: "",
    date: "",
  });

  // Load saved draft safely (coerce types)
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const restored = JSON.parse(savedDraft);
        setInitialValues((prev) => ({
          ...prev,
          ...restored,
          // keep explicit keys present
          clientName: restored.clientName ?? prev.clientName,
          clientId: restored.clientId ?? prev.clientId,
          staffName: restored.staffName ?? prev.staffName,
          noteworthyEvent: restored.noteworthyEvent ?? prev.noteworthyEvent,
          employeeSignature: restored.employeeSignature ?? prev.employeeSignature,
          date: restored.date ?? prev.date,
        }));
      }
    } catch (err) {
      console.warn("Failed to restore draft:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Save draft manually
  const handleSaveDraft = (values) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
      alert("Draft saved locally!");
    } catch (err) {
      console.error("Failed to save draft:", err);
      alert("Failed to save draft locally.");
    }
  };

  // Submit form to Firestore (attach under the shift doc as a nested object)
  const handleSubmit = async (values, { resetForm }) => {
    try {
      // Validate shiftId
      if (!shiftId) {
        alert(
          "Missing shiftId: cannot attach form. Make sure shiftId is provided when opening this form."
        );
        return;
      }
      if (typeof shiftId !== "string" && typeof shiftId !== "number") {
        alert("Invalid shiftId value.");
        return;
      }

      const data = {
        ...values,
        createdAt: serverTimestamp(),
      };

      // Convert shiftId to string for path safety
      const shiftRef = doc(db, "shifts", String(shiftId));

      // Use setDoc with merge so we don't overwrite other fields on the shift doc
      await setDoc(
        shiftRef,
        {
          [formType]: data,
          // optionally keep meta about last updated
          [`${formType}_meta`]: {
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );

      // clear local draft
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {
        console.warn("failed to remove draft from localStorage", err);
      }

      alert("Form submitted successfully!");
      resetForm();
      if (typeof onSuccess === "function") {
        try {
          onSuccess();
        } catch (err) {
          console.warn("onSuccess callback threw:", err);
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit the form. Try again.");
    }
  };

  return (
    <div className="bg-white flex flex-col rounded px-3 py-4 gap-4 text-light-black">
      {/* Header Section */}
      <div className="flex gap-4 justify-between">
        <div className="flex gap-4">
          <img src="/images/jam_triangle-notes.png" alt="" className="w-[52px]" />
          <div>
            <h1 className="font-bold text-[28px] leading-[32px]">Noteworthy Event</h1>
            <p className="font-normal text-[14px] leading-[20px]">
              Complete all sections thoroughly - This report is confidential and protected
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

      <hr className="border-t border-[#E6E6E6]" />

      {/* Formik */}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ errors, touched, values }) => (
          <Form className="flex flex-col gap-6">
            {/* Client Information */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold">
                Client Information <span className="text-red-500">*</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-16 border border-light-gray rounded p-4">
                <div>
                  <label className="font-bold text-sm leading-[20px]">Client Name</label>
                  <Field
                    name="clientName"
                    type="text"
                    className="w-full border rounded p-2 mt-1 border-light-gray"
                  />
                </div>

                <div>
                  <label className="font-bold text-sm leading-[20px]">Client ID Number</label>
                  <Field
                    name="clientId"
                    type="text"
                    className="w-full border rounded p-2 mt-1 border-light-gray"
                  />
                </div>

                <div>
                  <label className="font-bold text-sm leading-[20px]">Staff Name</label>
                  <Field
                    name="staffName"
                    type="text"
                    className="w-full border rounded p-2 mt-1 border-light-gray"
                  />
                </div>
              </div>
            </div>

            {/* Noteworthy Event */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold">
                Noteworthy Event <span className="text-red-500">*</span>
              </h2>
              <div>
                <Field
                  as="textarea"
                  name="noteworthyEvent"
                  placeholder="Write down any Noteworthy Event for the client."
                  className={`w-full border border-light-gray rounded p-2 h-40 focus:outline-none placeholder:text-[#72787E] placeholder:text-[14px] ${
                    touched.noteworthyEvent && errors.noteworthyEvent ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {touched.noteworthyEvent && errors.noteworthyEvent && (
                  <p className="text-red-500 text-xs mt-1">{errors.noteworthyEvent}</p>
                )}
              </div>
            </div>

            {/* Signature and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 rounded">
              <div>
                <label className="font-bold text-sm leading-[20px]">Employee Signature</label>
                <Field
                  name="employeeSignature"
                  type="text"
                  placeholder="Please write your name"
                  className={`w-full border rounded-sm p-2 mt-1 placeholder:text-sm placeholder:text-gray-500 ${
                    touched.employeeSignature && errors.employeeSignature ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {touched.employeeSignature && errors.employeeSignature && (
                  <p className="text-red-500 text-xs mt-1">{errors.employeeSignature}</p>
                )}
              </div>

              <div>
                <label className="font-bold text-sm leading-[20px]">Date</label>
                <Field
                  name="date"
                  type="date"
                  className={`w-full border rounded-sm p-2 mt-1 ${touched.date && errors.date ? "border-red-500" : "border-gray-300"}`}
                />
                {touched.date && errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
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

              <button type="submit" className="bg-purple-600 text-white font-semibold px-6 py-2 rounded hover:bg-purple-700">
                Submit
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default NoteworthyIncidentForm;
