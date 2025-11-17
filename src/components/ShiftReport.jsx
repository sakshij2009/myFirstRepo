import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaRegUserCircle } from "react-icons/fa";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ReportsSection from "./ReportsSection";
import MedicationPage from "./MedicationPage";

const ShiftReport = () => {
  const { id: shiftId } = useParams(); // ✅ get shiftId from route
  const [activeTab, setActiveTab] = useState("reports");
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch shift info based on shiftId from URL
  useEffect(() => {
    const fetchShiftData = async () => {
      if (!shiftId) return;
      try {
        const docRef = doc(db, "shifts", String(shiftId));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setShiftData(docSnap.data());
        } else {
          console.warn("No such shift found!");
        }
      } catch (error) {
        console.error("Error fetching shift data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShiftData();
  }, [shiftId]);

  if (!shiftId) {
    return <div className="p-7 text-red-500">No shift selected.</div>;
  }

  if (loading) {
    return <div className="p-7 text-gray-500">Loading shift details...</div>;
  }

  if (!shiftData) {
    return <div className="p-7 text-red-500">Shift not found</div>;
  }

  const {
    clientName,
    clientId,
    categoryName,
    dateOfBirth,
    clientAvatar,
    medicalInfo,
  } = shiftData;

  return (
    <div className="flex flex-col gap-6 p-2">
      <div>
        <p className="font-bold text-[24px] leading-[28px] text-light-black">
          Reports
        </p>
      </div>

      <hr className="border-t border-gray" />

      <div className="flex gap-4">
        {/* ---------------- Client Info ---------------- */}
        <div className="flex flex-col flex-1/5 gap-4">
          <div className="flex flex-col rounded p-4 gap-4 border border-light-gray bg-white text-light-black">
            <div>
              <p className="font-roboto font-bold text-[16px] leading-[24px]">
                Client Statistics
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex bg-gray-300 h-22 w-22 rounded-full overflow-hidden items-center justify-center">
                {clientAvatar ? (
                  <img
                    src={clientAvatar}
                    alt="Client"
                    className="rounded-full object-cover h-full w-full"
                  />
                ) : (
                  <FaRegUserCircle className="h-23 w-23 text-light-black" />
                )}
              </div>

              <div className="flex flex-col gap-2 text-nowrap">
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">Name:</p>
                  <p
                    className="font-bold text-[14px] leading-[20px] w-[127px] truncate"
                    title={clientName}
                  >
                    {clientName || "N/A"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">
                    Client ID:
                  </p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {clientId || "N/A"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">
                    Shift Category:
                  </p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {categoryName || "N/A"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <p className="font-normal text-[14px] leading-[20px]">
                    Date of Birth:
                  </p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {dateOfBirth || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-t border-gray" />

            <div className="flex flex-col gap-[7px]">
              <p className="font-roboto font-bold text-[16px] leading-[24px]">
                Medical Info
              </p>
              <p className="font-normal text-[14px] leading-[20px]">
                {medicalInfo || "Not available"}
              </p>
            </div>

            <hr className="border-t border-gray" />

            <div className="flex flex-col gap-3">
              <p className="font-roboto font-bold text-[16px] leading-[24px]">
                View Reports
              </p>
              <div></div>
            </div>
          </div>
        </div>

        {/* ---------------- Report Section ---------------- */}
        <div className="flex flex-4/5 gap-4 flex-col">
          <div className="w-full">
            <div className="flex space-x-5 relative">
              {["Reports", "Medications"].map((tab) => {
                const isActive = activeTab === tab.toLowerCase();
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className="relative pb-2 font-bold text-[14px] leading-[24px]"
                  >
                    {tab}
                    {isActive && (
                      <span className="absolute top-8 left-0 bottom-0 h-[2px] w-full bg-dark-green rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-b border-gray-300 w-full pt-0.5"></div>
          </div>

          <div>
            {activeTab === "reports" ? (
              <ReportsSection shiftId={shiftId} shiftData={shiftData} />
            ) : (
              <MedicationPage shiftData={shiftData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftReport;
