
import React, { useEffect, useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object({
  followThroughNote: Yup.string().required("Please describe the event"),
  employeeSignature: Yup.string().required("Employee Signature is required"),
  date: Yup.date().required("Date is required"),
});

const  FollowThroughForm = ({ clientData = {},shiftId, onCancel, onSuccess }) => {

  const formType = "followThroughEvent";
  const draftKey = `${formType}_draft_${shiftId}`;
  
   useEffect(() => {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const restored = JSON.parse(savedDraft);
        setInitialValues((prev) => ({
          ...prev,
          ...restored,
        }));
      }
    }, [draftKey]);
  
  
    // Save draft manually
    const handleSaveDraft = (values) => {
      localStorage.setItem(draftKey, JSON.stringify(values));
      alert("Draft saved locally!");
    };
  
    // Submit form to Firestore
    const handleSubmit = async (values, { resetForm }) => {
    try {
      const data = {
        ...values,
        createdAt: serverTimestamp(),
      };
  
      // find the existing shift document reference
      const shiftRef = doc(db, "shifts", shiftId);
  
      // update that document, attach the form data as a nested object
      await updateDoc(shiftRef, {
        [formType]: data, // example: "noteworthyEventForm": { ...data }
      });
  
      // clear local draft
      localStorage.removeItem(draftKey);
  
      alert("Form submitted successfully!");
      resetForm();
      onSuccess && onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit the form. Try again.");
    }
  };

  const[initialValues,setInitialValues]=useState({
          clientName: clientData?.clientName || "",
          clientId: clientData?.clientId || "",
          staffName: clientData?.staffName || "",
          followThroughNote: "",
          employeeSignature: "",
          date: "",
        });

  return (
    <div className=" bg-white flex flex-col rounded px-3 py-4 gap-4 text-light-black ">
      {/* Header Section */}
          <div className="flex  gap-4 justify-between">
                <div className="flex gap-4">
                   <img src="/images/jam_triangle-follow.png" alt="" className="w-[52px]" />
                    <div>
                    <h1 className="font-bold text-[28px] leading-[32px]">Follow Through</h1>
                    <p className="font-normal text-[14px] leading-[20px]">Complete all sections thoroughly - This report is confidential and protected</p>
                    </div>

                </div>
                <div>
                    <p className="text-light-green border border-light-green py-[6px] px-3 font-medium text-[14px] leading-[20px] rounded cursor-pointer"
                     onClick={() => {
                      try {
                        onCancel();
                      } catch (err) {
                        console.warn("onCancel callback threw:", err);
                      }
                    }}
                    >Cancel</p>
                  
                </div>
                
              </div>
              <div><hr className="border-t border-[#E6E6E6]" /></div>


      {/* Formik */}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          const completeData = {
            ...values,
            clientId: clientData?.clientId,
            clientName: clientData?.clientName,
            staffName: clientData?.username,
            createdAt: new Date().toISOString(),
          };
          console.log("Form Data Submitted:", completeData);
          if (onSubmit) onSubmit(completeData);
        }}
      >
        {({ errors, touched }) => (
          <Form className="flex flex-col gap-6 ">
            {/* Client Information */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold">
                Client Information <span className="text-red-500">*</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-16 border border-light-gray rounded p-4">
                <div>
                  <label className="font-bold text-sm leading-[20px] ">Client Name</label>
                  <Field
                    name="clientName"
                    type="text"
                    className="w-full border rounded p-2 mt-1  border-light-gray"
                  />
                </div>

                <div>
                  <label className="font-bold text-sm leading-[20px]">Client ID Number</label>
                  <Field
                    name="clientId"
                    type="text"
                    className="w-full border rounded p-2 mt-1  border-light-gray"
                  />
                </div>

                <div>
                  <label className="font-bold text-sm leading-[20px]">Staff Name</label>
                  <Field
                    name="staffName"
                    type="text"
                    className="w-full border rounded p-2 mt-1  border-light-gray"
                  />
                </div>
              </div>
            </div>

            {/* Noteworthy Event */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="leading-[28px] text-[24px] font-bold ">
                Noteworthy Event <span className="text-red-500">*</span>
              </h2>
              <div className="">
                <Field
                  as="textarea"
                  name="followThroughNote"
                  placeholder="Write down any Noteworthy Event for the client."
                  className={`w-full border border-light-gray rounded p-2 h-40 focus:outline-none placeholder:text-[#72787E] placeholder:text-[14px] ${
                    touched.followThroughNote && errors.followThroughNote
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {touched.followThroughNote && errors.followThroughNote && (
                  <p className="text-red-500 text-xs mt-1">{errors.followThroughNote}</p>
                )}
              </div>
            </div>

            {/* Signature and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 rounded ">
              <div>
                <label className="font-bold text-sm leading-[20px]">Employee Signature</label>
                <Field
                  name="employeeSignature"
                  type="text"
                  placeholder="Please write the name of client"
                  className={`w-full border rounded-sm p-2 mt-1 placeholder:text-sm placeholder:text-gray-500 ${
                    touched.employeeSignature && errors.employeeSignature
                      ? "border-red-500"
                      : "border-gray-300"
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
                  className={`w-full border rounded-sm p-2 mt-1 ${
                    touched.date && errors.date ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {touched.date && errors.date && (
                  <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleSaveDraft(values)}
                className="bg-white text-light-green font-semibold px-6 py-2 rounded border border-light-green focus:outline-0 cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="submit"
                className="bg-light-green text-white font-semibold px-6 py-2 rounded cursor-pointer"
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

export default  FollowThroughForm;
