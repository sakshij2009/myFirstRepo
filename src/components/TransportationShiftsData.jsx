import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // adjust your path

const TransportationShiftsData = ({ filteredShifts }) => {
  const [intakeForms, setIntakeForms] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch intake forms for all clients in filteredShifts
  useEffect(() => {
    const fetchIntakeForms = async () => {
  if (!filteredShifts || filteredShifts.length === 0) return;

  const querySnapshot = await getDocs(collection(db, "InTakeForms"));
  const forms = {};
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.inTakeClients)) {
      data.inTakeClients.forEach((client) => {
        if (client.name) {
          forms[client.name] = client; // store client info by name
        }
      });
    }
  });

  setIntakeForms(forms);
};


    fetchIntakeForms();
  }, [filteredShifts]);

  // Pagination logic
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredShifts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const transportationData = filteredShifts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] w-full">
      {transportationData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <p className="text-lg font-semibold">No Shifts Found</p>
          <p className="text-sm text-gray-400">
            Looks like there are no shifts to display right now.
          </p>
        </div>
      ) : (
        transportationData.map((shift) => {
          const clientForm = intakeForms[shift.clientName] || {};

          return (
            <div
              key={shift.id}
              className="flex flex-col gap-[10px] p-[16px] rounded-[4px] bg-white"
            >
              <div className="flex justify-between w-full">
                <div>
                  <img src="/images/carImage.png" alt="" />
                </div>

                {/* Center section with transport info */}
                <div className="flex flex-col gap-[12px] w-full px-2">
                  <div className="flex justify-between text-light-black">
                    <div className="flex flex-col gap-[4px]">
                      <div className="flex gap-[4px] text-[14px] leading-[20px]">
                        <p className="font-normal">Pick Up Address:</p>
                        <p className="font-bold truncate w-50" title={clientForm.pickupAddress}>
                          {clientForm.pickupAddress || "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-[4px] text-[14px] leading-[20px]">
                        <p className="font-normal">Pick Up Time:</p>
                        <p className="font-bold">
                          {shift.pickupTime || clientForm.pickupTime || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-[4px]">
                      <div className="flex gap-[4px] text-[14px] leading-[20px] justify-center">
                        <p className="font-normal">Visit Address:</p>
                        <p className="font-bold w-50 truncate" title={clientForm.visitAddress}>
                          {clientForm.visitAddress || "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-[4px] text-[14px] leading-[20px] justify-center">
                        <p className="font-normal">Arrived Time:</p>
                        <p className="font-bold">{shift.arrivalTime || "N/A"}</p>
                        <p className="font-normal">Drop Off Time:</p>
                        <p className="font-bold">{shift.dropOffTime || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-[4px]">
                      <div className="flex gap-[4px] text-[14px] leading-[20px] justify-end">
                        <p className="font-normal">Drop Off Address:</p>
                        <p className="font-bold">
                          {clientForm.dropOffAddress || "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-[4px] text-[14px] leading-[20px] justify-end">
                        <p className="font-normal">Drop Off Time:</p>
                        <p className="font-bold">
                          {shift.dropOffTime || clientForm.dropOffTime || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress UI */}
                  <div className="flex flex-col gap-[8px]">
                    <div className="flex items-center w-full">
                      <div className="flex items-center">
                        <img src="/images/incomplete.png" alt="" />
                      </div>
                      <div className="flex-1 border-t-2 border-green-800" />
                      <div className="flex items-center">
                        <img src="/images/incomplete.png" alt="" />
                      </div>
                      <div className="flex-1 border-t-2 border-dashed border-gray" />
                      <div className="flex items-center">
                        <img src="/images/incomplete.png" alt="" />
                      </div>
                    </div>

                    <div className="flex justify-between text-light-black">
                      <div className="text-[14px] font-bold">Incomplete</div>
                      <div className="text-[14px] font-bold">Incomplete</div>
                      <div className="text-[14px] font-bold">Incomplete</div>
                    </div>
                  </div>
                </div>

                <div>
                  <img src="/images/carImage.png" alt="" />
                </div>
              </div>

              <hr className="border-t border-gray-300" />

              <div className="flex justify-between">
                <div className="flex gap-[9px] text-[14px] leading-[20px]">
                  <div className="flex gap-[4px]">
                    <p className="font-normal">Client Name:</p>
                    <p className="font-bold">{shift.clientName}</p>
                  </div>
                  <div className="w-px h-6 bg-gray-400"></div>
                  <div className="flex gap-[4px]">
                    <p className="font-normal">Client Id:</p>
                    <p className="font-bold">{shift.clientId || "N/A"}</p>
                  </div>
                  <div className="w-px h-6 bg-gray-400"></div>
                  <div className="flex gap-[4px]">
                    <p className="font-normal">Seat Type:</p>
                    <p className="font-bold">{clientForm.typeOfSeat || "N/A"}</p>
                  </div>
                  <div className="w-px h-6 bg-gray-400"></div>
                  <div className="flex gap-[4px]">
                    <p className="font-normal">Transportations:</p>
                    <p className="font-bold">
                      {clientForm.transportationMode || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex text-light-green font-medium text-sm gap-5">
                  <div>View in Maps</div>
                  <div>View More</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TransportationShiftsData;
