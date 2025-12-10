import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { IoChevronDown } from "react-icons/io5";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const ManageAgency = () => {
  const [search, setSearch] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [agencyTypeOpen, setAgencyTypeOpen] = useState(false);
  const [agencyTypeOptions, setAgencyTypeOptions] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();

  const getAgencyTypesStyles = (agency) => {
    switch (agency) {
      case "Private":
        return "bg-[#FFF7ED] border border-[#F54A4A] rounded-[8px] py-1 px-2 text-[#F54A4A] font-bold text-[14px] leading-[140%] w-[115px]";
      case "Government":
        return "bg-[#FAF5FF] border border-[#9837FB] rounded-[8px] py-1 px-2 text-[#9837FB] font-bold text-[14px] leading-[140%]";
      case "Non Profit":
        return "bg-[#EFF6FF] border border-[#385DFC] rounded-[8px] py-1 px-2 text-[#385DFC] font-bold text-[14px] leading-[140%]";
      default:
        return "truncate font-bold text-[14px] leading-[140%]";
    }
  };

  // ✅ Fetch all agencies
  useEffect(() => {
  const fetchAgencies = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "agencies"));
      let agencyList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ Sort by createdAt (latest first)
      agencyList.sort((a, b) => {
        const dateA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // latest first
      });

      setAgencies(agencyList);
    } catch (error) {
      console.error("Error fetching agencies:", error);
    }
  };

  fetchAgencies();
}, []);


  // ✅ Delete agency
  const handleDelete = async (agencyId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this agency?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "agencies", agencyId));
      setAgencies((prev) => prev.filter((a) => a.id !== agencyId));
      alert("Agency deleted successfully!");
    } catch (error) {
      console.error("Error deleting agency:", error);
      alert("Failed to delete agency. Please try again.");
    }
  };

  // ✅ Fetch agency types
  useEffect(() => {
    const fetchAgencyTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "AgencyTypes"));
        const typeList = querySnapshot.docs.map((doc) => doc.data().name);
        setAgencyTypeOptions(typeList);
      } catch (error) {
        console.error("Error fetching agency types:", error);
      }
    };
    fetchAgencyTypes();
  }, []);

  // ✅ Filter agencies
  const filteredAgencies = agencies.filter((agency) => {
    const searchMatch =
      !search ||
      agency.name?.toLowerCase().includes(search.toLowerCase()) ||
      agency.id?.toString().toLowerCase().includes(search.toLowerCase());

    const typeMatch = !agencyType || agencyType === "All" || agency.agencyType === agencyType;
    return searchMatch && typeMatch;
  });

  // ✅ Pagination
  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filteredAgencies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAgencies = filteredAgencies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getRate = (rateList, name) => {
    const rateItem = rateList?.find((r) => r.name === name);
    return rateItem ? rateItem.rate || rateItem.billingRate : "_";
  };

  return (
    <div className="flex flex-col gap-[24px] p-7">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <p className="font-bold text-[24px] leading-[28px] text-light-black">Manage Agency</p>
          <div className="flex gap-[10px] text-[#535E5E]">
            <p className="font-medium text-[14px] leading-[20px]">
              Total Agency: <span className="font-bold">{agencies.length}</span>
            </p>
            <p className="font-medium text-[14px] leading-[20px]">
              Showing Agency: <span className="font-bold">{filteredAgencies.length}</span>
            </p>
          </div>
        </div>

        {/* ✅ “Add Agency” button now routes to /admin-dashboard/add/add-agency */}
        <div
          className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green"
          onClick={() => navigate("/admin-dashboard/add/add-agency")}
        >
          <FaPlus className="w-[10px]" />
          <p className="font-medium text-[14px] leading-[20px]">Add Agency</p>
        </div>
      </div>

      <hr className="border-t border-gray" />

      {/* Filters + Search */}
      <div className="flex justify-between h-[40px]">
        <div className="flex gap-[24px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-light-gray rounded-[4px] w-[342px] focus:outline-none pt-2 pr-3 pb-2 pl-6 bg-white placeholder-[#809191] placeholder:text-[12px]"
              placeholder="Search with Name or Client ID"
            />
            {search === "" && <IoIosSearch className="absolute top-3.5 left-2 text-[#809191]" />}
          </div>
        </div>

        {/* Agency Type Filter */}
        <div className="relative flex gap-3">
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">Agency Type</p>
            <button
              onClick={() => setAgencyTypeOpen(!agencyTypeOpen)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {agencyType || "All"} <IoChevronDown />
            </button>
          </div>

          {agencyTypeOpen && (
            <div className="absolute right-[3px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {["All", ...agencyTypeOptions].map((type) => (
                  <li
                    key={type}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                    onClick={() => {
                      setAgencyType(type === "All" ? "" : type);
                      setAgencyTypeOpen(false);
                    }}
                  >
                    {type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Agency Table */}
      <div className="min-h-[500px]">
        <div className="w-full rounded border border-light-gray">
          <table className="bg-white w-full rounded">
            <thead>
              <tr className="h-[65px] align-text-top">
                <th className="font-bold text-[14px] py-2 px-4 text-left w-[149px]">Agency</th>
                <th className="font-bold text-[14px] py-2 px-4 text-left w-[143px]">Agency Type</th>
                <th className="font-bold text-[14px] py-2 px-4 text-left w-[143px]">Email</th>
                <th className="font-bold text-[14px] py-2 px-4 text-right w-[165px]">Emergent Care Rate (in $)</th>
                <th className="font-bold text-[14px] py-2 px-4 text-right w-[160px]">Administration Rate (in $)</th>
                <th className="font-bold text-[14px] py-2 px-4 text-right w-[200px]">Supervised Visitation Rate (in $)</th>
                <th className="font-bold text-[14px] py-2 px-4 text-right w-[158px]">Respite Care Rate (in $)</th>
                <th className="font-bold text-[14px] py-2 px-4 text-right w-[200px]">
                  Supervised Visitation + Transportation Rate(in $)
                </th>
                <th className="font-bold text-[14px] py-2 px-4 text-center w-[158px]">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentAgencies.map((agency, index) => (
                <tr key={index} className="h-[65px] text-nowrap">
                  <td
                    className="font-normal text-[14px] border-light-gray border-t py-2 px-4 text-light-green truncate max-w-[150px]"
                    title={agency.name}
                  >
                    {agency.name}
                  </td>
                  <td className="border-light-gray border-t py-2 px-4">
                    <span className={getAgencyTypesStyles(agency.agencyType)}>
                      {agency.agencyType}
                    </span>
                  </td>
                  <td
                    className="font-normal text-[14px] border-light-gray border-t py-2 px-4 truncate max-w-[150px]"
                    title={agency.email}
                  >
                    {agency.email || "_"}
                  </td>

                  {/* Dynamic rates */}
                  <td className="font-normal text-[14px] border-t border-light-gray py-2 px-4 text-right">
                    {getRate(agency.rateList, "Emergent Care")}
                  </td>
                  <td className="font-normal text-[14px] border-t border-light-gray py-2 px-4 text-right">
                    {getRate(agency.rateList, "Administration")}
                  </td>
                  <td className="font-normal text-[14px] border-t border-light-gray py-2 px-4 text-right">
                    {getRate(agency.rateList, "Supervised Visitation")}
                  </td>
                  <td className="font-normal text-[14px] border-t border-light-gray py-2 px-4 text-right">
                    {getRate(agency.rateList, "Respite Care")}
                  </td>
                  <td className="font-normal text-[14px] border-t border-light-gray py-2 px-4 text-right">
                    {getRate(agency.rateList, "Supervised Visitation + Transportation")}
                  </td>

                  {/* ✅ Actions */}
                  <td className="font-normal text-[14px] border-t border-light-gray py-2 px-4 text-right">
                    <div className="flex gap-[8px] justify-center">
                      <img
                        src="/images/edit.png"
                        alt="edit"
                        className="h-4 w-4 cursor-pointer"
                        onClick={() => navigate(`/admin-dashboard/add/update-agency/${agency.id}`)}
                      />
                      <div className="w-px h-6 bg-gray"></div>
                      <img
                        src="/images/delete.png"
                        alt="delete"
                        className="w-[14px] h-[18px] cursor-pointer"
                        onClick={() => handleDelete(agency.id)}
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
        <div className="flex justify-end items-center gap-1">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            «
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
            .map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 border border-[#C5C5C5] rounded ${
                  currentPage === page ? "bg-light-green text-white" : ""
                }`}
              >
                {page}
              </button>
            ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50 bg-white"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageAgency;
