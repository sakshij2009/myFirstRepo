import React, { useEffect, useState } from "react";
import IntakeForm from "./IntakeForm";
import { useNavigate } from "react-router-dom";

const IntakeFormPage = ({ user }) => {
  const [isCaseWorker, setIsCaseWorker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "Intake Worker") {
      setIsCaseWorker(true);
    }
  }, [user]);

  return (
    <div className="flex flex-col p-2 gap-3 px-6 w-full">
      

      <div className="flex w-full  rounded  py-3 justify-center">
        <IntakeForm isCaseWorker={isCaseWorker} user={user} />
      </div>
    </div>
  );
};

export default IntakeFormPage;
