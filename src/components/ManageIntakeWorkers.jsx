
import React, { useEffect, useState, useRef } from "react";
import { FaPlus } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { IoChevronDown, IoClose } from "react-icons/io5";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { sendSignInLinkToEmail } from "firebase/auth";

const ManageIntakeWorkers = () => {
  const [search, setSearch] = useState("");
  const [intakeWorkers, setIntakeWorkers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusOpen, setStatusOpen] = useState(false);
  const [role, setRole] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);


  const navigate = useNavigate();
  const roles = ["All", "Parent", "Intake Worker"];



  // ✅ Fetch Users
  // =======================
  // 📌 FETCH INTAKE WORKERS
  // =======================

  useEffect(() => {
    const fetchIntakeWorkers = async () => {
      try {
        const snap = await getDocs(collection(db, "intakeUsers"));  // 👈 NEW COLLECTION

        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setIntakeWorkers(list);  // 👈 NEW STATE
      } catch (error) {
        console.error("Error fetching intake workers:", error);
      }
    };

    fetchIntakeWorkers();
  }, []);


  // =======================
  // 📌 DELETE INTAKE WORKER
  // =======================

  const handleDeleteIntakeWorker = async (worker) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete intake worker "${worker.name}"?`
    );
    if (!confirmDelete) return;

    try {
      // 🔍 Find this worker in Firestore by email (unique)
      const q = query(
        collection(db, "intakeUsers"),
        where("email", "==", worker.email)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Error: Intake worker not found in database.");
        return;
      }

      // There will be only one worker with this email
      const docId = snap.docs[0].id;

      // ❌ Delete this intake worker
      await deleteDoc(doc(db, "intakeUsers", docId));

      // Update UI
      setIntakeWorkers((prev) => prev.filter((w) => w.email !== worker.email));

      alert("Intake worker deleted successfully");
    } catch (error) {
      console.error("Error deleting intake worker:", error);
      alert("Failed to delete intake worker.");
    }
  };


  // =======================
  // 📌 INVITE INTAKE WORKER
  // =======================
  const handleInvite = async () => {
    if (!inviteEmail) {
      alert("Please enter an email address");
      return;
    }

    setInviting(true);

    // Configuration for the email link — embed email so worker's browser auto-detects it
    const encodedEmail = encodeURIComponent(inviteEmail.trim().toLowerCase());
    const actionCodeSettings = {
      url: `${window.location.origin}/intake-form/login?email=${encodedEmail}`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, inviteEmail.trim().toLowerCase(), actionCodeSettings);

      alert(`Invitation link sent to ${inviteEmail}`);
      setShowModal(false);
      setInviteEmail("");
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Error sending invite: " + error.message);
    } finally {
      setInviting(false);
    }
  };



  // =======================
  // 📌 FILTERING (ONLY SEARCH)
  // =======================

  const filteredIntakeWorkers = intakeWorkers.filter((worker) => {
    const matchesSearch =
      !search ||
      worker.name?.toLowerCase().includes(search.toLowerCase()) ||
      worker.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      !role || role === "All" || worker.role?.toLowerCase() === role.toLowerCase();

    return matchesSearch && matchesRole;
  });



  // ✅ Pagination logic
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredIntakeWorkers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentIntakeWorkers = filteredIntakeWorkers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] p-4 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-[24px] leading-[28px] text-light-black">Manage Intake Worker</p>
          <div className="flex gap-[10px] text-[#535E5E]">
            <p className="font-medium text-[14px] leading-[20px]">
              Total Intake Workers: <span className="font-bold">{intakeWorkers.length}</span>
            </p>
            <p className="font-medium text-[14px] leading-[20px]">
              Showing Intake Workers: <span className="font-bold">{filteredIntakeWorkers.length}</span>
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
          <p className="font-medium text-[14px] leading-[20px]">Add Intake Worker</p>
        </div>

      </div>

      <hr className="border-t border-gray" />

      {/* Filters */}
      <div className="flex justify-between h-[40px]">
        <div className="flex gap-[24px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-[#C5C5C5] rounded-[4px] w-[342px] focus:outline-none pt-2 pr-3 pb-2 pl-6 bg-[#FFFFFF] placeholder-[#809191] placeholder:text-[12px]"
              placeholder="Search with Name"
            />
            {search === "" && <IoIosSearch className="absolute top-3.5 left-2 text-[#809191]" />}
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">
              Role
            </p>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-1 text-light-green cursor-pointer text-nowrap"
            >
              {role || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Dropdown Lists */}
          {statusOpen && (
            <div className="absolute right-0 top-[30px] w-30 bg-white shadow-lg rounded-md z-50 border border-gray-100">
              <ul className="py-2">
                {roles.map((g) => (
                  <li
                    key={g}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                    onClick={() => {
                      setRole(g === "All" ? "" : g);
                      setStatusOpen(false);
                    }}
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="min-h-[500px]">
        <div className="w-full rounded border border-light-gray text-light-black">
          <table className="bg-white w-full rounded">
            <thead>
              <tr className="h-[65px]">
                <th className="text-left px-4 max-w-50 max-h-16">Intake Worker Name</th>
                <th className="text-left px-4">Email</th>
                <th className="text-left px-4">Phone Number</th>
                <th className="text-left px-4">Role</th>
                <th className="text-left px-4">Invoice E-mail</th>
                <th className="text-center px-4">Name of Agency</th>
                <th className="text-center px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentIntakeWorkers.map((user, index) => (
                <tr key={index} className="border-t border-light-gray">
                  <td className="px-4 py-3 max-w-50 h-16">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 max-w-30">{user.phone}</td>
                  <td className="px-4 py-3 w-40">{user.role}</td>
                  <td className="px-4 py-3 w-50">{user.invoiceEmail}</td>
                  <td className="px-4 py-3 w-40">{user.agency}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <img
                        src="/images/edit.png"
                        alt="edit"
                        className="h-4 w-4 cursor-pointer"
                        onClick={() =>
                          navigate(`/admin-dashboard/add/update-intakeworker/${user.email}`)
                        }
                      />
                      <div className="w-px h-6 bg-gray"></div>
                      <img
                        src="/images/delete.png"
                        alt="delete"
                        className="h-[18px] w-[14px] cursor-pointer"
                        onClick={() => handleDeleteIntakeWorker(user)}
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
                className={`px-3 py-1 border border-[#C5C5C5] rounded ${currentPage === page ? "bg-light-green text-white" : ""
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


      {/* ADD INTAKE WORKER MODAL */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-50 transition-opacity"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl w-[500px] p-6 pointer-events-auto">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-light-black">Add Intake Worker</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter email to generate registration link</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IoClose size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-light-black">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="worker@example.com"
                    className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-dark-green"
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                  A unique registration link will be generated. The link will expire in 7 days.
                </div>

              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 marginTop-6 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviting}
                  className="px-4 py-2 bg-dark-green text-white rounded hover:opacity-90 font-medium disabled:opacity-70"
                >
                  {inviting ? "Sending..." : "Send Link"}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ManageIntakeWorkers;
