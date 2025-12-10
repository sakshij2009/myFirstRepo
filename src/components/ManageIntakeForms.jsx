import React, { useEffect, useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { IoChevronDown } from "react-icons/io5";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import IntakeFormChoiceModel from "./IntakeFormChoiceModel";

const ManageIntakeForms = () => {
  const [search, setSearch] = useState("");
  const [forms, setForms] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [formType, setFormType] = useState("All");
  const [formStatus, setFormStatus] = useState("All");
  const [formTypeOpen, setFormTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const formTypeOptions = ["All", "Parent Form", "Intake Worker Form"];
  const statusOptions = ["All", "Pending", "Submitted", "Accepted", "Rejected"];

  // =======================
// 📌 FETCH FORMS (OLD + NEW)
// =======================
useEffect(() => {
  const fetchForms = async () => {
    try {
      const snap = await getDocs(collection(db, "InTakeForms"));
      const list = snap.docs.map((d) => {
        const data = d.data();

        const normalized = {
          id: d.id,
          formId: data.formId || data.id || "N/A",
          formType:
            data.formType || (data.inTakeWorkerName ? "Intake Worker" : "Private "),
          filledBy:
            data.filledBy ||
            data.inTakeWorkerName ||
            data.nameOfPerson ||
            data.parentName ||
            "Unknown",
          clients:
            data.clients?.client1?.fullName
              ? [data.clients.client1.fullName]
              : Array.isArray(data.inTakeClients)
              ? data.inTakeClients.map((c) => c.name)
              : Array.isArray(data.clients)
              ? data.clients
              : [data.nameInClientTable || "—"],
          submittedOn:
            data.submittedOn || data.createDate || data.date || data.dateOfInTake || "—",
          status: data.status || "Pending",
          isEditable: data.isEditable || false,
        };

        return normalized;
      });

      // 🧠 SORT LATEST FIRST
      const sorted = list.sort((a, b) => {
        const parseDate = (str) => {
          if (!str) return 0;

          // Handle different date formats
          // Examples: "10 Nov 2025 04:08 PM", "10-11-2025", "2025-11-10"
          let date;
          if (str.includes("PM") || str.includes("AM")) {
            date = new Date(str.replace(/(\d{2}) (\w{3}) (\d{4})/, "$2 $1, $3"));
          } else if (str.includes("-")) {
            const parts = str.split("-");
            if (parts[2]?.length === 4) {
              // Format: dd-mm-yyyy
              date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              date = new Date(str);
            }
          } else {
            date = new Date(str);
          }
          return date.getTime() || 0;
        };

        return parseDate(b.submittedOn) - parseDate(a.submittedOn);
      });

      setForms(sorted);
    } catch (error) {
      console.error("Error fetching intake forms:", error);
    }
  };

  fetchForms();
}, []);

  // =======================
  // 📌 DELETE FORM
  // =======================
  const handleDeleteForm = async (formId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this form?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "InTakeForms", formId));
      setForms((prev) => prev.filter((f) => f.id !== formId));
      alert("Form deleted successfully");
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    }
  };

  // =======================
  // 📌 TOGGLE EDITING ACCESS
  // =======================
  const handleToggleEdit = async (form) => {
    const newState = !form.isEditable;
    try {
      await updateDoc(doc(db, "InTakeForms", form.id), { isEditable: newState });

      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, isEditable: newState } : f))
      );
    } catch (error) {
      console.error("Error updating edit access:", error);
      alert("Failed to update edit access.");
    }
  };

  // =======================
  // 📌 FILTERING
  // =======================
  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      !search ||
      form.formId?.toLowerCase().includes(search.toLowerCase()) ||
      form.filledBy?.toLowerCase().includes(search.toLowerCase()) ||
      form.clients?.join(", ").toLowerCase().includes(search.toLowerCase());

    const matchesType = formType === "All" || form.formType === formType;
    const matchesStatus = formStatus === "All" || form.status === formStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // =======================
  // 📌 PAGINATION
  // =======================
  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filteredForms.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentForms = filteredForms.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] p-4">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <p className="font-bold text-[24px] leading-[28px] text-light-black">
            Manage Intake Forms
          </p>
          <div className="flex gap-[10px] text-[#535E5E]">
            <p className="font-medium text-[14px] leading-[20px]">
              Total Forms: <span className="font-bold">{forms.length}</span>
            </p>
            <p className="font-medium text-[14px] leading-[20px]">
              Showing Forms: <span className="font-bold">{filteredForms.length}</span>
            </p>
          </div>
        </div>
         <div
                  className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
                  onClick={() => setShowModal(true)}
                >
                  <p className="w-[10px]">
                    <FaPlus />
                  </p>
                  <p className="font-medium text-[14px] leading-[20px]">Add Intake Form</p>
                </div>
      </div>

      <hr className="border-t border-gray" />

      {/* Filters */}
      <div className="flex justify-between h-[40px] relative">
        <div className="flex gap-[24px]">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-[#C5C5C5] rounded-[4px] w-[342px] focus:outline-none pt-2 pr-3 pb-2 pl-6 bg-[#FFFFFF] placeholder-[#809191] placeholder:text-[12px]"
              placeholder="Search with Form ID, Name, or Client"
            />
            {search === "" && (
              <IoIosSearch className="absolute top-3.5 left-2 text-[#809191]" />
            )}
          </div>
        </div>

        {/* Dropdown Filters (right-aligned, just like ManageUser) */}
        <div className="relative flex gap-3">
          {/* Form Type Filter */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">Form Type</p>
            <button
              onClick={() => {
                setFormTypeOpen(!formTypeOpen);
                setStatusOpen(false);
              }}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {formType} <IoChevronDown />
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">Status</p>
            <button
              onClick={() => {
                setStatusOpen(!statusOpen);
                setFormTypeOpen(false);
              }}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {formStatus} <IoChevronDown />
            </button>
          </div>

          {/* Dropdown Menus */}
          {formTypeOpen && (
            <div className="absolute right-[160px] top-[40px] w-40 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {formTypeOptions.map((type) => (
                  <li
                    key={type}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-green-600"
                    onClick={() => {
                      setFormType(type);
                      setFormTypeOpen(false);
                    }}
                  >
                    {type}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Intake Modal */}
      {showModal && (
        <IntakeFormChoiceModel
          setShowModal={setShowModal}
          
        />
      )}

          {statusOpen && (
            <div className="absolute right-[10px] top-[40px] w-40 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {statusOptions.map((status) => (
                  <li
                    key={status}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-green-600"
                    onClick={() => {
                      setFormStatus(status);
                      setStatusOpen(false);
                    }}
                  >
                    {status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Forms Table */}
      <div className="min-h-[500px]">
        <div className="w-full rounded border border-light-gray text-light-black">
          <table className="bg-white w-full rounded text-light-black">
            <thead>
              <tr className="h-[65px] text-[14px] ">
                <th className="text-left px-4">Form ID</th>
                <th className="text-left px-4">Form Type</th>
                <th className="text-left px-4">Filled By</th>
                <th className="text-left px-4 max-w-20">Client(s)</th>
                <th className="text-left px-4">Submitted On</th>
                <th className="text-center px-4">Status</th>
                <th className="text-center px-4">Editing Access</th>
                <th className="text-center px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentForms.map((form, index) => (
                <tr key={index} className="border-t border-light-gray text-[14px] h-[65px]">
                  <td className="px-4 py-3">{form.formId}</td>
                  <td className="px-4 py-3">{form.formType}</td>
                  <td className="px-4 py-3">{form.filledBy}</td>
                  <td className="px-4 py-3 max-w-50 truncate " title= {Array.isArray(form.clients) ? form.clients.join(", ") : form.clients}>
                    {Array.isArray(form.clients) ? form.clients.join(", ") : form.clients}
                  </td>
                  <td className="px-4 py-3">{form.submittedOn}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-[14px] font-medium border ${
                         form.status === "Accepted"
                          ? "bg-[#E5FFD3] text-light-green border-green-500 "
                          : form.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : form.status === "Submitted"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {form.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.isEditable}
                        onChange={() => handleToggleEdit(form)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-dark-green transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <img
                        src="/images/edit.png"
                        alt="view"
                        className="h-4 w-4 cursor-pointer"
                        onClick={() =>
                          navigate(`/admin-dashboard/add/update-intake-form/${form.formId}?type=${form.formType}`)
                        }
                      />
                      <div className="w-px h-6 bg-gray"></div>
                      <img
                        src="/images/delete.png"
                        alt="delete"
                        className="h-[18px] w-[14px] cursor-pointer"
                        onClick={() => handleDeleteForm(form.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-1">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50"
          >
            «
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50"
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
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageIntakeForms;
