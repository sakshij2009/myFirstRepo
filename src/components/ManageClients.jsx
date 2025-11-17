import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { IoChevronDown } from "react-icons/io5";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const ManageClients = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [clients, setClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientStatusOpen, setClientStatusOpen] = useState(false);
  const [agencyTypeOpen, setAgencyTypeOpen] = useState(false);
  const [agencyTypeOptions, setAgencyTypeOptions] = useState([]);
  const [servicesMap, setServicesMap] = useState({});

  const genderOptions = ["All", "Male", "Female"];
  const clientStatusOptions = ["Active", "Inactive","Closed"];

  const getStatusStyles = (status) => {
    switch (status) {
      case "Active":
        return "bg-lime border border-parrot-green text-[#2D8C0C] px-[8px] py-[4px] rounded-[8px] font-medium text-[14px] leading-[16px]";
      case "Inactive":
        return "bg-[#EAEEF2] text-[#54585D] border border-[#C8C9C9] px-[8px] py-[4px] rounded-[8px] font-medium text-[14px] leading-[16px]";
      default:
        return "";
    }
  };

  const getShiftCategoryStyle = (category) => {
    switch (category) {
      case "Emergent Care":
        return "bg-[#FFF1F2] border border-[#FFCCD3] rounded-[8px] py-1 px-2 text-[#C70036] font-bold text-[14px] leading-[140%] w-[115px]";
      case "Supervised Visitation":
        return "bg-[#FFFBEB] border border-[#FEE685] rounded-[8px] py-1 px-2 text-[#BF4D00] font-bold text-[14px] leading-[140%]";
      case "Respite Care":
        return "bg-[#ECFEFF] border border-[#A2F4FD] rounded-[8px] py-1 px-2 text-[#007595] font-bold text-[14px] leading-[140%]";
      case "Transportation":
        return "bg-[#EEF2FF] border border-[#C6D2FF] rounded-[8px] py-1 px-2 text-[#4330DC] font-bold text-[14px] leading-[140%]";
      default:
        return "truncate font-bold text-[14px] leading-[140%]";

    }
  };

  const handleToggle = async (clientId, value) => {
  try {
    await updateDoc(doc(db, "clients", clientId), {
      fileClosed: value,
    });
    console.log("File closed updated:", value);
  } catch (error) {
    console.error("Error updating fileClosed:", error);
  }
};

  // ✅ Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        const clientList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientList);
        fetchServiceTypes(clientList);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  const fetchServiceTypes = async (clientList) => {
    try {
      const services = {};
      const intakeSnapshot = await getDocs(collection(db, "InTakeForms"));
      const intakeForms = intakeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      for (const client of clientList) {
        const matchedIntake = intakeForms.find((form) =>
          form.inTakeClients?.some(
            (c) => c.name?.trim() === client.name?.trim()
          )
        );

        if (matchedIntake) {
          const clientData = matchedIntake.inTakeClients.find(
            (c) => c.name?.trim() === client.name?.trim()
          );
          const service = Array.isArray(clientData?.serviceRequired)
            ? clientData.serviceRequired.join(", ")
            : clientData?.serviceRequired;

          services[client.name?.trim()] = service || "_";
        } else {
          services[client.name?.trim()] = "_";
        }
      }

      setServicesMap({ ...services });
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  };

  useEffect(() => {
    const fetchAgencyTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "AgencyTypes"));
        const typeList = querySnapshot.docs.map((doc) => doc.data().name);
        setAgencyTypeOptions(typeList);
      } catch (error) {
        console.error("Error fetching shift types:", error);
      }
    };
    fetchAgencyTypes();
  }, []);

  // Filtering
  const filteredClients = clients.filter((client) => {
    const genderMatches =
      !gender || gender === "All" || client.gender === gender;
   const clientStatusMatches =
  !clientStatus ||
  clientStatus === "All" ||
  (clientStatus === "Active" && client.clientStatus === "Active") ||
  (clientStatus === "Inactive" && client.clientStatus === "Inactive") ||
  (clientStatus === "Closed" && client.fileClosed === true);

    const searchMatches =
      !search ||
      client.name?.toLowerCase().includes(search.toLowerCase()) ||
      client.clientCode?.toString().toLowerCase().includes(search.toLowerCase());
    return searchMatches && clientStatusMatches && genderMatches;
  });

  // Pagination
  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentClients = filteredClients.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] p-5">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <p className="font-bold text-[24px] leading-[28px] text-light-black">
            Manage Clients
          </p>
          <div className="flex gap-[10px] text-[#535E5E]">
            <p className="font-medium text-[14px] leading-[20px]">
              Total Client: <span className="font-bold">{clients.length}</span>
            </p>
            <p className="font-medium text-[14px] leading-[20px]">
              Showing Client:{" "}
              <span className="font-bold">{filteredClients.length}</span>
            </p>
          </div>
        </div>

        <div
          className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
          onClick={() => navigate("/admin-dashboard/add/add-client")}
        >
          <p className="w-[10px]">
            <FaPlus />
          </p>
          <p className="font-medium text-[14px] leading-[20px]">Add Client</p>
        </div>
      </div>

      <hr className="border-t border-gray" />

      {/* Search + Filters */}
      <div className="flex justify-between h-[40px]">
        <div className="flex gap-[24px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-1 border-light-gray rounded-[4px] w-[342px] focus:outline-none pt-2 pr-3 pb-2 pl-6 bg-[#FFFFFF] placeholder-[#809191] placeholder:text-[12px]"
              placeholder=" Search with Name, Client ID"
            />
            {search === "" && (
              <IoIosSearch className="absolute top-3.5 left-2 text-[#809191]" />
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="relative flex gap-3">
          {/* Gender */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">
              Gender
            </p>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {gender || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Agency */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">
              Agency
            </p>
            <button
              onClick={() => setAgencyTypeOpen(!agencyTypeOpen)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {agencyType || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Client Status */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">
              Client Status
            </p>
            <button
              onClick={() => setClientStatusOpen(!clientStatusOpen)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {clientStatus || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Dropdown Lists */}
          {statusOpen && (
            <div className="absolute right-[270px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {genderOptions.map((g) => (
                  <li
                    key={g}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                    onClick={() => {
                      setGender(g === "All" ? "" : g);
                      setStatusOpen(false);
                    }}
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {agencyTypeOpen && (
            <div className="absolute right-[150px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {["All", ...agencyTypeOptions].map((agency) => (
                  <li
                    key={agency}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                    onClick={() => {
                      setAgencyType(agency === "All" ? "" : agency);
                      setAgencyTypeOpen(false);
                    }}
                  >
                    {agency}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clientStatusOpen && (
            <div className="absolute right-[3px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {["All", ...clientStatusOptions].map((client) => (
                  <li
                    key={client}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                    onClick={() => {
                      setClientStatus(client === "All" ? "" : client);
                      setClientStatusOpen(false);
                    }}
                  >
                    {client}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="min-w-[500px] min-h-[500px]">
        <div className="w-full rounded border border-light-gray">
          <table className="bg-white w-full rounded">
            <thead>
              <tr className="h-[65px] align-text-top">
                <th className="font-bold text-[14px] py-3 px-4 text-left max-w-40">
                  Client Name
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-left">
                  Client Code
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-left">
                  Service Type
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-left">
                  Client Status
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-left">
                  Parent E-mail
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-left">
                  Agency
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-center">
                  File Closure
                </th>
                <th className="font-bold text-[14px] py-3 px-4 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {currentClients.map((client, index) => (
                <tr key={index} className="h-[65px]">
                  <td
                    className="font-normal text-[14px] border-t border-light-gray py-3 px-4 text-light-green truncate max-w-40"
                    title={client.name}
                  >
                    {client.name}
                  </td>
                  <td className="font-normal text-[14px] border-t border-light-gray py-3 px-4 max-w-40">
                    {client.clientCode || "_"}
                  </td>
                  <td className="font-normal text-[14px] border-t border-light-gray py-3 px-4 max-w-40">
                    <span className={getShiftCategoryStyle(
                      servicesMap[client.name?.trim()]
                    )}>
                      {servicesMap[client.name?.trim()] || "_"}
                    </span>
                  </td>
                  <td className="border-t py-3 px-4 border-light-gray max-w-40">
                    <span className={getStatusStyles(client.clientStatus)}>
                      {client.clientStatus || "_"}
                    </span>
                  </td>
                  <td className="font-normal text-[14px] border-t py-3 px-4 border-light-gray max-w-40">
                    {client.email || "_"}
                  </td>
                  <td
                    className="font-normal text-[14px] border-t py-3 px-4 truncate border-light-gray max-w-40"
                    title={client.agencyName}
                  >
                    {client.agencyName}
                  </td>
                  <td className="font-normal text-[14px] border-t py-3 px-4 border-light-gray text-center max-w-35">
                    <div className="flex items-center justify-center gap-2">

                      {/* NO label */}
                      <span className="text-[14px] text-light-black font-bold">No</span>

                      {/* Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={client.fileClosed}
                          onChange={(e) => handleToggle(client.id, e.target.checked)}
                        />

                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-dark-green transition-colors"></div>

                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                      </label>

                      {/* YES label */}
                      <span className="text-[14px] text-light-black font-bold">Yes</span>

                    </div>
                  </td>


                  <td className="font-normal text-[14px] border-t py-3 px-4 text-center border-light-gray max-w-40">
                    <div className="flex gap-[8px] justify-center">
                      <img
                        src="/images/edit.png"
                        alt="edit"
                        className="h-4 w-4 cursor-pointer"
                        onClick={() =>
                          navigate(`/admin-dashboard/add/update-client/${client.id}`)
                        }
                      />
                      <div className="w-px h-6 bg-gray"></div>
                      <img
                        src="/images/delete.png"
                        alt="delete"
                        className="w-[14px] h-[18px] cursor-pointer"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-1 p-[10px] rounded">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-gray rounded disabled:opacity-50 bg-white"
          >
            «
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-gray rounded disabled:opacity-50 bg-white"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(
              Math.max(0, currentPage - 3),
              Math.min(totalPages, currentPage + 2)
            )
            .map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 border border-gray rounded ${
                  currentPage === page ? "bg-light-green text-white" : "bg-white"
                }`}
              >
                {page}
              </button>
            ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-gray rounded disabled:opacity-50 bg-white"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-gray rounded disabled:opacity-50 bg-white"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageClients;
