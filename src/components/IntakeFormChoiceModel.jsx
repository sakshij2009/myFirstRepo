  import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';

  const IntakeFormChoiceModel = ({ setShowModal, isEdit = false, intakeId = null }) => {

    const[choice,setChoice]=useState('');

     const navigate = useNavigate();

   const handleContinue = () => {
    if (!choice) {
      alert("Please select a form type first.");
      return;
    }

    setShowModal(false);

    if (isEdit && intakeId) {
      // ✅ Navigate for update mode
      navigate(`/admin-dashboard/add/update-intake-form/${intakeId}?type=${choice}`);
    } else {
      // ✅ Navigate for add mode
      navigate(`/admin-dashboard/add/add-intake-form?type=${choice}`);
    }
  };

    return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Background overlay */}
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => setShowModal(false)}
        />

        {/* Modal Box */}
        <div className="relative bg-white rounded-sm shadow-lg w-[740px] z-10 gap-4">
          {/* Green Header */}
          <div className="bg-green-800 text-white px-6 py-3 rounded-t-md">
            <h2 className="text-2xl font-bold leading-7">Intake Form</h2>
          </div>

          {/* Modal Content */}
          <div className="p-6  ">
            <p className="flex font-bold text-base leading-5 tracking-normal">Choose Form Type?</p>
            <hr className="flex my-2 text-light-gray" />

            {/* Radio Buttons */}
            <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="radio"
      name="formType"
      value="IntakeWorker"
      checked={choice === 'IntakeWorker'} // controlled via state
      onChange={() => setChoice('IntakeWorker')}
      className="mt-1 h-5 w-5 accent-dark-green "
    />
    <span>
      <span className="font-bold text-sm leading-4 tracking-[0.2%]">Intake Worker Form</span>
      <br />
      <span className="font-normal text-xs leading-4 tracking-[0.2%]">
        Form to be completed by the Intake worker.
      </span>
    </span>
  </label>

  <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="radio"
      name="formType"
      value="Private"
      checked={choice === 'Private'} // controlled via state
      onChange={() => setChoice('Private')}
      className="mt-1 h-5 w-5 accent-dark-green "
    />
    <span>
      <span className="font-bold text-sm leading-4 tracking-[0.2%]">Private Form</span>
      <br />
      <span className="font-normal text-xs leading-4 tracking-[0.2%]">
        Form for families or private organizations.
      </span>
    </span>
  </label>

            </div>

            {/* Divider */}
            <hr className="flex my-2 text-light-gray" />

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-[6px] border border-dark-green text-dark-green rounded-md cursor-pointer "
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                className=" bg-dark-green text-white rounded-md py-[6px] px-3 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  export default IntakeFormChoiceModel
