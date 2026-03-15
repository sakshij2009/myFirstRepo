import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { IoArrowBackCircleOutline } from "react-icons/io5";
import IntakeForm from "./IntakeForm";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const IntakeFormPage = ({ user, onBack, id: propId }) => {
  const [isCaseWorker, setIsCaseWorker] = useState(false);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  // New forms are always editable; existing forms respect the admin-controlled flag

  const { id: routeId } = useParams();
  const location = useLocation();
  const isUpdateMode = location.pathname.includes("update-intake-form");

  // determine final ID (from prop or route)
  const formId = propId || routeId;

  useEffect(() => {
    if (user?.role === "Intake Worker") {
      setIsCaseWorker(true);
    }
  }, [user]);

  // Track editability separately from loading
  const [isEditable, setIsEditable] = useState(!isUpdateMode); // new form = always editable

  useEffect(() => {
    const fetchForm = async () => {
      if (!isUpdateMode || !formId) {
        // "Add" mode → editable, no Firestore fetch needed
        setIsEditable(true);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "InTakeForms", formId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({ id: formId, ...data });
          // ✅ Use admin-controlled flag; default to true if field not yet set
          setIsEditable(data.isEditable ?? true);
        } else {
          console.warn("⚠️ Intake form not found:", formId);
          setIsEditable(true);
        }
      } catch (err) {
        console.error("❌ Error fetching form data:", err);
        setIsEditable(true);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId, isUpdateMode, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-gray-500">
        Loading form...
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 gap-3 px-6 w-full">
      {/* ✅ Back button */}
      <div className="flex items-center gap-3 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-dark-green hover:text-green-800 transition-colors"
        >
          <IoArrowBackCircleOutline size={28} />
          <span className="text-[16px] font-medium">Back</span>
        </button>
      </div>

      {/* ✅ Intake Form (with editable flag) */}
      <div className="flex w-full rounded py-3 justify-center">
        <IntakeForm
          user={user}
          isCaseWorker={isCaseWorker}
          existingData={formData}
          mode={isUpdateMode ? "update" : "add"}
          id={formId}
          isEditable={isEditable} // ✅ Pass here
        />
      </div>
    </div>
  );
};

export default IntakeFormPage;
