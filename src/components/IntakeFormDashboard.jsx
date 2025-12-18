import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "react-datepicker/dist/react-datepicker.css";
import { IoChevronDown } from "react-icons/io5";
import CustomCalendar from "./CustomerCalender";
import { FaPlus } from "react-icons/fa6";
import { MdOutlineEdit, MdDelete } from "react-icons/md";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import TopBar from "./TopBar";
import { useNavigate } from "react-router-dom"; 

const IntakeFormDashboard = ({user, onLogout,onAddIntake }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftCategory, setShiftCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [intakeForms, setIntakeForms] = useState([]);

  

const navigate = useNavigate();


  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;
const [allClients, setAllClients] = useState([]);

  // ✅ Fetch clients (for clientCode lookup)
useEffect(() => {
  const fetchClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));
      const clientList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("🧾 All clients from 'clients' collection:", clientList);
      setAllClients(clientList);
    } catch (error) {
      console.error("❌ Error fetching clients:", error);
    }
  };

  fetchClients();
}, []);


  // ✅ Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "shiftCategories"));
        let categoryList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Example filter
        categoryList = categoryList.filter(
          (cat) => cat.name !== "Supervise Visitation plus Transportation"
        );

        setCategories(categoryList);
        if (categoryList.length > 0) setShiftCategory(categoryList[0].name);
      } catch (error) {
        console.error("Error fetching shift categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // ✅ Fetch intake forms
  // ✅ Fetch intake forms (filtered by logged-in user and flattened clients)
useEffect(() => {
  const fetchIntakeForms = async () => {
    if (!user?.name) {
      console.warn("⚠️ No logged-in user found for intake filtering");
      return;
    }

    try {
      // ✅ Fetch all forms, clients, and categories
      const [formsSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, "InTakeForms")),
        getDocs(collection(db, "shiftCategories")),
      ]);

      const allForms = formsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔹 Create a category map (ID → Name)
      const categoryMap = {};
      categoriesSnap.forEach((doc) => {
        const data = doc.data();
        categoryMap[doc.id] = data.name || data.categoryName || "Unknown Category";
      });

      // 🔹 Filter forms belonging to this logged-in worker
      const relevantForms = allForms.filter((form) => {
        const workerName =
          form.workerInfo?.workerName ||
          form.intakeworkerName ||
          form.nameOfPerson ||
          "";

        return (
          workerName.trim().toLowerCase() === user.name.trim().toLowerCase()
        );
      });

      // 🔹 Flatten clients from each form
      const flattenedClients = relevantForms.flatMap((form) => {
        // ✅ Helper to resolve care categories
        const resolveServiceCategory = () => {
          const serviceArray =
            form.serviceRequired ||
            form.services?.serviceRequired ||
            form.services?.serviceType ||
            [];

          if (Array.isArray(serviceArray)) {
            return serviceArray
              .map((id) => categoryMap[id] || id) // Replace ID with readable name
              .join(", ");
          } else if (typeof serviceArray === "string") {
            return categoryMap[serviceArray] || serviceArray;
          } else {
            return "—";
          }
        };

        if (form.clientsCreated && form.clients) {
          return Object.values(form.clients).map((client) => {
            const matchedClient =
              allClients.find(
                (c) =>
                  c.name?.trim().toLowerCase() ===
                  client.fullName?.trim().toLowerCase()
              ) || {};

            return {
              intakeId: form.id,
              intakeworkerName:
                form.workerInfo?.workerName ||
                form.intakeworkerName ||
                form.nameOfPerson ||
                "",
              agencyName: form.agencyName || "",
              clientName: client.fullName || "Unnamed Client",
              clientCode: matchedClient.clientCode || client.clientCode || "—",
              dob: client.birthDate || "",
              address: client.address || "",
              serviceRequired: resolveServiceCategory(), // ✅ converted to readable names
              status: form.status || "",
            };
          });
        } else {
          return (form.inTakeClients || []).map((c) => {
            const matchedClient =
              allClients.find(
                (cl) =>
                  cl.name?.trim().toLowerCase() ===
                  c.name?.trim().toLowerCase()
              ) || {};

            return {
              intakeId: form.id,
              intakeworkerName:
                form.workerInfo?.workerName ||
                form.intakeworkerName ||
                form.nameOfPerson ||
                "",
              agencyName: form.agencyName || "",
              clientName: c.name || form.nameInClientTable || "Unnamed Client",
              clientCode: matchedClient.clientCode || form.clientCode || "—",
              dob: c.dob || "",
              address: c.address || "",
              serviceRequired: resolveServiceCategory(), // ✅ converted to readable names
              status: form.status || "",
            };
          });
        }
      });

      console.log("✅ Flattened client records:", flattenedClients);
      setIntakeForms(flattenedClients);
    } catch (error) {
      console.error("❌ Error fetching intake forms:", error);
    }
  };

  fetchIntakeForms();
}, [user?.name, allClients]);




  // ✅ Filtered data
// ✅ Search filter (client name or code)
const filteredForms = intakeForms.filter((client) => {
  const searchMatches =
    !searchTerm ||
    client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientCode?.toString().toLowerCase().includes(searchTerm.toLowerCase());

  return searchMatches;
});


console.log("✅ Filtered forms for display:", filteredForms);


  // ✅ Pagination
  const totalPages = Math.ceil(filteredForms.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentForms = filteredForms.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ✅ Calendar helpers
  const formatDDMMYYYY = (date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const { calendarBadge, isThisWeek } = useMemo(() => {
    if (!selectedDates.length) {
      const today = new Date();
      return {
        calendarBadge: formatDDMMYYYY(today),
        isThisWeek: true,
      };
    }

    const sortedDates = [...selectedDates].sort((a, b) => a - b);
    let badgeText = "";
    if (sortedDates.length === 1) {
      badgeText = formatDDMMYYYY(sortedDates[0]);
    } else {
      const first = formatDDMMYYYY(sortedDates[0]);
      const last = formatDDMMYYYY(sortedDates[sortedDates.length - 1]);
      badgeText = `${first} - ${last}`;
    }

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const inThisWeek = sortedDates.every((date) =>
      isWithinInterval(date, { start: weekStart, end: weekEnd })
    );

    return {
      calendarBadge: badgeText,
      isThisWeek: inThisWeek,
    };
  }, [selectedDates]);

  const handleViewIntakeForm = (intakeId) => {
  if (!intakeId) return;
  navigate(`/intake-form/update-intake-form/${intakeId}`);
};


  return (
    <div className="flex flex-col">
      <TopBar user={user} onLogout={onLogout}/>
    <div className="flex flex-col p-5 gap-6 h-full">
      
      <div className="flex justify-between">
        <p className="font-bold text-[24px] leading-[28px] text-light-black">
          Intake Worker
        </p>
        <div
          onClick={onAddIntake}
          className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
        >
          <p className="w-[10px]">
            <FaPlus />
          </p>
          <p className="font-medium text-[14px] leading-[20px]">Add Intake Form</p>
        </div>
      </div>

      <hr className="border-t border-gray " />

      <div className="flex flex-col gap-4 ">
        <div className="flex flex-col gap-4 p-4">
          <div className="font-bold text-[20px] leading-[24px] text-light-black">
            Client Intake Forms
          </div>
          <div className="flex justify-between min-h-[32px] text-light-black relative">
            {/* Left controls */}
            <div className="flex gap-[12px] items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-[#C5C5C5] rounded-[4px] w-[342px] focus:outline-none pt-2 pr-3 pb-2 pl-2 bg-[#FFFFFF] placeholder-[#C5C5C5] placeholder:text-[12px]"
                placeholder="Search with Name, Client ID"
              />

              {/* Calendar trigger */}
              <div className="relative flex gap-3 items-center">
                <p className="font-bold text-[16px] leading-[24px]">Calendar</p>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-[6px] rounded border border-light-green text-light-green"
                >
                  <span className="text-sm font-medium">{calendarBadge}</span>
                  <span>
                    <IoChevronDown />
                  </span>
                </button>

                {calendarOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setCalendarOpen(false)}
                    />
                    <div className="absolute z-50 top-10 left-0 pointer-events-auto shadow-lg rounded bg-white">
                      <CustomCalendar
                        selectedDates={selectedDates}
                        onDatesChange={(dates) => setSelectedDates(dates)}
                        onClose={() => setCalendarOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-[12px] items-center">
                {isThisWeek && (
                  <p className="font-bold text-[16px] leading-[24px]">This Week</p>
                )}
                <div className="w-px h-6 bg-gray-400"></div>
                <p className="font-normal text-base leading-6 tracking-normal">
                  Showed Results ({filteredForms.length})
                </p>
              </div>
            </div>

            {/* Right controls - Category dropdown */}
            {/* <div className="flex gap-[12px] items-center relative">
              <p className="font-bold text-base leading-6">Shift Category</p>
              <button
                onClick={() => setCategoryOpen(!categoryOpen)}
                className="flex items-center gap-1 text-light-green"
              >
                {shiftCategory || "Select"} <IoChevronDown />
              </button>

              {categoryOpen && (
                <>
                  <div
                    onClick={() => setCategoryOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <div className="absolute right-0 top-[40px] w-48 bg-white border border-gray-200 shadow-lg rounded-md z-50">
                    <ul className="py-1">
                      {categories.map((cat) => (
                        <li
                          key={cat.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black font-normal text-[14px] leading-[20px]"
                          onClick={() => {
                            setShiftCategory(cat.name);
                            setCategoryOpen(false);
                          }}
                        >
                          {cat.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div> */}
          </div>

          {/* Table */}
          <div className="w-full rounded ">
            <table className="bg-white w-full rounded">
              <thead>
                <tr className="h-[65px] align-text-top ">
                  <th className="font-bold text-[14px]  py-3 px-4 rounded-tl-[4px] text-left w-[249px] m-auto ">
                    Client Name
                  </th>
                  <th className="font-bold text-[14px]  py-3 px-4 text-left w-[249px]">
                    Client Code
                  </th>
                  <th className="font-bold text-[14px]  py-3 px-4 text-left w-[249px]">
                    Care Category
                  </th>
                  <th className="font-bold text-[14px]  py-3 px-4 text-left w-[249px]">
                    D.O.B
                  </th>
                  <th className="font-bold text-[14px]  py-3 px-4 text-left w-[249px]">
                    Address
                  </th>
                  <th className="font-bold text-[14px]   py-3 px-4 text-center w-[249px] ">
                    View Intake Form
                  </th>
                </tr>
              </thead>
             <tbody>
  {currentForms.map((client, index) => (
    <tr key={`${client.intakeId}-${index}`} className="h-[65px]">
      <td className="font-normal text-[14px] border-gray border border-l-0 border-b-0 border-r-0 py-3 px-4 text-light-green truncate max-w-[249px]">
        {client.clientName || "_"}
      </td>
      <td className="font-normal text-[14px] border-gray border border-r-0 border-l-0 border-b-0 py-3 px-4">
        {client.clientCode || "_"}
      </td>
      <td className="font-normal text-[14px] border-gray border border-b-0 border-l-0 border-r-0 py-3 px-4">
        {client.serviceRequired || "_"}
      </td>
      <td className="font-normal text-[14px] border-gray border border-r-0 border-l-0 border-b-0 py-3 px-4">
        {client.dob || "_"}
      </td>
      <td className="font-normal text-[14px] border-gray border border-r-0 border-l-0 border-b-0 py-3 px-4 truncate max-w-[249px]">
        {client.address || "_"}
      </td>
      <td className="font-normal text-[14px] border-gray border border-b-0 border-r-0 border-l-0 py-3 px-4">
  <div
    className="flex gap-[8px] justify-center text-dark-green cursor-pointer hover:underline"
    onClick={() => handleViewIntakeForm(client.intakeId)}
  >
    View Intake Form
  </div>
</td>

    </tr>
  ))}
</tbody>

            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center mt-4 gap-1">
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
                .slice(
                  Math.max(0, currentPage - 3),
                  Math.min(totalPages, currentPage + 2)
                )
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
      </div>
    </div>
    </div>
  );
};

export default IntakeFormDashboard;
