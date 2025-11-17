import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { IoChevronDown } from "react-icons/io5";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const ManageUser = () => {
  const [search, setSearch] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [shiftHours, setShiftHours] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [shiftHoursOpen, setshiftHoursOpen] = useState(false);
  const [shiftTypeOpen, setShiftTypeOpen] = useState(false);
  const [shiftTypeOptions, setShiftTypeOptions] = useState([]);

  const navigate = useNavigate();

  const genderOptions = ["All", "Male", "Female"];
  const shiftHoursOption = ["All", "12:00 Hours", "9:00 Hours", "6:00 Hours"];

  // ✅ Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const userList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // ✅ Fetch shift types dynamically
  useEffect(() => {
    const fetchShiftTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "shiftTypes"));
        const typeList = querySnapshot.docs.map((doc) => doc.data().name);
        setShiftTypeOptions(typeList);
      } catch (error) {
        console.error("Error fetching shift types:", error);
      }
    };
    fetchShiftTypes();
  }, []);

  // ✅ Delete user
  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      alert("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  // ✅ Filtering logic
  const filteredUsers = users.filter((user) => {
    const genderMatches = !gender || gender === "All" || user.gender === gender;
    const shiftHourMatches =
      !shiftHours || shiftHours === "All" || user.shiftHours === shiftHours;
    const shiftTypeMatches =
      !shiftType || shiftType === "All" || user.shiftType === shiftType;
    const searchMatches =
      !search ||
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.userId?.toString().toLowerCase().includes(search.toLowerCase());

    return genderMatches && shiftHourMatches && shiftTypeMatches && searchMatches;
  });

  // ✅ Pagination logic
  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-[24px] p-4">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <p className="font-bold text-[24px] leading-[28px] text-light-black">Manage Staff</p>
          <div className="flex gap-[10px] text-[#535E5E]">
            <p className="font-medium text-[14px] leading-[20px]">
              Total Staff: <span className="font-bold">{users.length}</span>
            </p>
            <p className="font-medium text-[14px] leading-[20px]">
              Showing Staff: <span className="font-bold">{filteredUsers.length}</span>
            </p>
          </div>
        </div>

        {/* ✅ Add User (Route Navigation) */}
        <div
          className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
          onClick={() => navigate("/admin-dashboard/add/add-user")}
        >
          <p className="w-[10px]">
            <FaPlus />
          </p>
          <p className="font-medium text-[14px] leading-[20px]">Add Staff</p>
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
              placeholder="Search with Name, Client ID"
            />
            {search === "" && <IoIosSearch className="absolute top-3.5 left-2 text-[#809191]" />}
          </div>
        </div>

        {/* Gender, Shift, and Type filters */}
        <div className="relative flex gap-3">
          {/* Gender */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">Gender</p>
            <button
              onClick={() => setStatusOpen(true)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {gender || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Shift Hours */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">Shift Hours</p>
            <button
              onClick={() => setshiftHoursOpen(true)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {shiftHours || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Shift Type */}
          <div className="flex gap-[14px] items-center">
            <p className="font-bold text-base leading-6 text-light-black">Shift Type</p>
            <button
              onClick={() => setShiftTypeOpen(true)}
              className="flex items-center gap-1 text-light-green cursor-pointer"
            >
              {shiftType || "All"} <IoChevronDown />
            </button>
          </div>

          {/* Dropdowns */}
          {statusOpen && (
            <div className="absolute right-[270px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {genderOptions.map((gender) => (
                  <li
                    key={gender}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-green-600"
                    onClick={() => {
                      setGender(gender === "All" ? "" : gender);
                      setStatusOpen(false);
                    }}
                  >
                    {gender}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shiftHoursOpen && (
            <div className="absolute right-[150px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {shiftHoursOption.map((shiftHour) => (
                  <li
                    key={shiftHour}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-green-600"
                    onClick={() => {
                      setShiftHours(shiftHour === "All" ? "" : shiftHour);
                      setshiftHoursOpen(false);
                    }}
                  >
                    {shiftHour}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shiftTypeOpen && (
            <div className="absolute right-[3px] top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
              <ul className="py-2">
                {["All", ...shiftTypeOptions].map((type) => (
                  <li
                    key={type}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-green-600"
                    onClick={() => {
                      setShiftType(type === "All" ? "" : type);
                      setShiftTypeOpen(false);
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

      {/* Users Table */}
      <div className="min-h-[500px]">
        <div className="w-full rounded border border-light-gray text-light-black">
          <table className="bg-white w-full rounded">
            <thead>
              <tr className="h-[65px]">
                <th className="text-left px-4 max-w-50 max-h-16">Staff Name</th>
                <th className="text-left px-4">Staff ID</th>
                <th className="text-left px-4">Username</th>
                <th className="text-center px-4">Gender</th>
                <th className="text-left px-4">Phone No</th>
                <th className="text-left px-4">Salary Per Hour</th>
                <th className="text-center px-4">Suspension</th>
                <th className="text-center px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user, index) => (
                <tr key={index} className="border-t border-light-gray">
                  <td className="px-4 py-3 max-w-50 h-16">{user.name}</td>
                  <td className="px-4 py-3">{user.userId}</td>
                  <td className="px-4 py-3 max-w-30">{user.username}</td>
                  <td className="px-4 py-3 text-center w-50">
                    <span
                      className={`px-3 py-1 rounded-[4px] border ${
                        user.gender === "Male"
                          ? "bg-[#9CDBFB] text-[#005C92] border-[#00A8FF]"
                          : "bg-[#FEE9EE] text-[#940730] border-[#FCA7BC]"
                      }`}
                    >
                      {user.gender}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-50">{user.phone}</td>
                  <td className="px-4 py-3 w-40">${user.salary}</td>
                  <td className="px-4 py-3 text-center ">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-dark-green transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <img
                        src="/images/edit.png"
                        alt="edit"
                        className="h-4 w-4 cursor-pointer"
                        onClick={() =>
                          navigate(`/admin-dashboard/add/update-user/${user.userId}`)
                        }
                      />
                      <div className="w-px h-6 bg-gray"></div>
                      <img
                        src="/images/delete.png"
                        alt="delete"
                        className="h-[18px] w-[14px] cursor-pointer"
                        onClick={() => handleDeleteUser(user.id)}
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

export default ManageUser;
