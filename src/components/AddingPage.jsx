import React, { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import IntakeFormChoiceModel from "./IntakeFormChoiceModel";

const AddingPage = ({ user }) => {
  const [showModel, setShowModel] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="h-full">
      {showModel && (
        <IntakeFormChoiceModel
          setShowModal={setShowModel}
          handleOpenForm={(formTypePath) => {
            setShowModel(false);
            navigate(`/admin-dashboard/add/${formTypePath}`);
          }}
        />
      )}
      <Outlet />
    </div>
  );
};

export default AddingPage;
