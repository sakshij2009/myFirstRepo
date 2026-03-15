import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import "react-datepicker/dist/react-datepicker.css";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import CustomCalendar from "./CustomerCalender";
import { FaPlus } from "react-icons/fa6";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import TopBar from "./TopBar";
import { useNavigate } from "react-router-dom";
import ReportsSection from "./ReportsSection";
import FileClosureSlider from "./FileClosureSlider";
import ServicePlanForm from "./ServicePlanForm";
import AddTransportation from "./AddTransportation";

/* ── Status badge ──────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    Accepted: { bg: "bg-green-100", text: "text-green-700", label: "Accepted" },
    Rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
    Submitted: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Submitted" },
  };
  const s = map[status] || { bg: "bg-gray-100", text: "text-gray-500", label: status || "Pending" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

/* ── Main Component ────────────────────────────────────────── */
const IntakeFormDashboard = ({ user, onLogout, onAddIntake }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [intakeForms, setIntakeForms] = useState([]);   // one entry per FORM (not per client)
  const [expandedIds, setExpandedIds] = useState({});   // { formId: bool }
  const [accessibleShifts, setAccessibleShifts] = useState([]);
  const [reportModal, setReportModal] = useState({ open: false, shifts: [], familyName: "" });
  const [selectedShiftReport, setSelectedShiftReport] = useState(null);
  const [shiftReportTab, setShiftReportTab] = useState("reports");
  const [servicePlanStep, setServicePlanStep] = useState("observations");
  const [closureSliderOpen, setClosureSliderOpen] = useState(false);
  const [selectedClosureClient, setSelectedClosureClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();

  /* fetch shifts with report access */
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const snap = await getDocs(query(collection(db, "shifts"), where("accessToShiftReport", "==", true)));
        setAccessibleShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    };
    fetchShifts();
  }, []);

  /* fetch intake forms (one entry per FORM) */
  useEffect(() => {
    const fetchForms = async () => {
      if (!user?.name) return;
      try {
        const [formsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, "InTakeForms")),
          getDocs(collection(db, "shiftCategories")),
        ]);

        const categoryMap = {};
        categoriesSnap.forEach((d) => {
          categoryMap[d.id] = d.data().name || "Unknown";
        });

        const allForms = formsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        /* filter by logged-in worker name */
        const mine = allForms.filter((form) => {
          const wName =
            form.workerInfo?.workerName ||
            form.intakeworkerName ||
            form.nameOfPerson || "";
          return wName.trim().toLowerCase() === user.name.trim().toLowerCase();
        });

        /* convert each form to a "family record" */
        const families = mine.map((form) => {
          // ── resolve siblings array ──────────────────────────
          let siblings = [];
          if (form.clients && !Array.isArray(form.clients)) {
            // new structure: clients = { client1: {...}, client2: {...} }
            siblings = Object.values(form.clients).map((c) => ({
              fullName: c.fullName || c.name || "Unnamed",
              birthDate: c.birthDate || c.dob || "",
              address: c.address || "",
            }));
          } else if (Array.isArray(form.inTakeClients)) {
            // old structure
            siblings = form.inTakeClients.map((c) => ({
              fullName: c.name || c.fullName || "Unnamed",
              birthDate: c.dob || c.birthDate || "",
              address: c.address || "",
            }));
          }

          // ── family name ──────────────────────────────────────
          const familyName =
            form.familyName ||
            (siblings[0]?.fullName
              ? siblings[0].fullName.split(" ").slice(-1)[0] + " Family"
              : "Unknown Family");

          // ── care category ────────────────────────────────────
          const serviceArray = form.services?.serviceType || form.serviceRequired || [];
          const careCategory = Array.isArray(serviceArray)
            ? serviceArray.map((id) => categoryMap[id] || id).join(", ")
            : categoryMap[serviceArray] || serviceArray || "—";

          return {
            id: form.id,
            familyName,
            siblings,
            careCategory,
            status: form.status || "Submitted",
            clientIds: siblings.map((_, i) => form.id + "_" + i),
          };
        });

        setIntakeForms(families);
        setCurrentPage(1);
      } catch (err) { console.error("Error fetching intake forms:", err); }
    };
    fetchForms();
  }, [user?.name]);

  /* toggle a family row open/closed */
  const toggleRow = (id) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  /* search filter */
  const filtered = useMemo(() =>
    intakeForms.filter((f) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        f.familyName.toLowerCase().includes(q) ||
        f.siblings.some((s) => s.fullName.toLowerCase().includes(q))
      );
    }), [intakeForms, searchTerm]);

  /* pagination */
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* calendar badge */
  const formatDDMMYYYY = (d) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const { calendarBadge, isThisWeek } = useMemo(() => {
    const sorted = [...selectedDates].sort((a, b) => a - b);
    const badge = sorted.length === 1
      ? formatDDMMYYYY(sorted[0])
      : `${formatDDMMYYYY(sorted[0])} - ${formatDDMMYYYY(sorted[sorted.length - 1])}`;
    const today = new Date();
    const wStart = startOfWeek(today, { weekStartsOn: 1 });
    const wEnd = endOfWeek(today, { weekStartsOn: 1 });
    const inWeek = sorted.every((d) => isWithinInterval(d, { start: wStart, end: wEnd }));
    return { calendarBadge: badge, isThisWeek: inWeek };
  }, [selectedDates]);

  const formatDate = (v) => {
    if (!v) return "";
    if (v.seconds) return new Date(v.seconds * 1000).toLocaleDateString();
    return String(v);
  };

  return (
    <div className="flex flex-col">
      <TopBar user={user} onLogout={onLogout} />
      <div className="flex flex-col p-5 gap-6 h-full">

        {/* ── Header ── */}
        <div className="flex justify-between">
          <p className="font-bold text-[24px] leading-[28px] text-light-black">Intake Worker</p>
          <div
            onClick={onAddIntake}
            className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green"
          >
            <FaPlus />
            <p className="font-medium text-[14px] leading-[20px]">Add Intake Form</p>
          </div>
        </div>

        <hr className="border-t border-gray" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4">
            <div className="font-bold text-[20px] leading-[24px] text-light-black">Client Intake Forms</div>

            {/* ── Controls ── */}
            <div className="flex justify-between min-h-[32px] text-light-black relative">
              <div className="flex gap-[12px] items-center">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-[#C5C5C5] rounded-[4px] w-[342px] focus:outline-none pt-2 pr-3 pb-2 pl-2 bg-white placeholder-[#C5C5C5] placeholder:text-[12px]"
                  placeholder="Search by family name or client name"
                />

                {/* Calendar */}
                <div className="relative flex gap-3 items-center">
                  <p className="font-bold text-[16px] leading-[24px]">Calendar</p>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-[6px] rounded border border-light-green text-light-green"
                  >
                    <span className="text-sm font-medium">{calendarBadge}</span>
                    <IoChevronDown />
                  </button>
                  {calendarOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
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
                  {isThisWeek && <p className="font-bold text-[16px] leading-[24px]">This Week</p>}
                  <div className="w-px h-6 bg-gray-400" />
                  <p className="font-normal text-base leading-6">Showed Results ({filtered.length})</p>
                </div>
              </div>
            </div>

            {/* ── Table ── */}
            <div className="w-full rounded overflow-x-auto">
              <table className="bg-white w-full rounded border-collapse">
                <thead>
                  <tr className="h-[52px] bg-gray-50">
                    <th className="font-bold text-[13px] py-3 px-4 text-left w-8"></th>
                    <th className="font-bold text-[13px] py-3 px-4 text-left">Family Name</th>
                    <th className="font-bold text-[13px] py-3 px-4 text-left">Clients</th>
                    <th className="font-bold text-[13px] py-3 px-4 text-left">Care Category</th>
                    <th className="font-bold text-[13px] py-3 px-4 text-left">Status</th>
                    <th className="font-bold text-[13px] py-3 px-4 text-center">View Intake Form</th>
                    <th className="font-bold text-[13px] py-3 px-4 text-center">File Closure</th>
                    <th className="font-bold text-[13px] py-3 px-4 text-center">Shift Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        No intake forms found
                      </td>
                    </tr>
                  ) : (
                    paged.map((family) => {
                      const isOpen = !!expandedIds[family.id];
                      const firstSibling = family.siblings[0] || {};

                      /* shift reports for this family's clients */
                      const familyShifts = accessibleShifts.filter((s) => {
                        const shiftClient = (s.clientName || s.clientDetails?.name || "").toLowerCase();
                        if (!shiftClient) return false;

                        // Check if shift belongs to the entire family
                        if (family.familyName.toLowerCase() === shiftClient) return true;

                        // Or check if shift belongs to a specific sibling
                        return family.siblings.some((sib) =>
                          (sib.fullName || "").toLowerCase() === shiftClient
                        );
                      });

                      return (
                        <React.Fragment key={family.id}>
                          {/* ── Family row ── */}
                          <tr
                            className="h-[52px] border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleRow(family.id)}
                          >
                            {/* Toggle icon */}
                            <td className="px-4 text-gray-400">
                              {isOpen
                                ? <IoChevronDown className="w-4 h-4" />
                                : <IoChevronForward className="w-4 h-4" />}
                            </td>

                            {/* Family Name */}
                            <td className="font-semibold text-[14px] px-4 text-light-black">
                              {family.familyName}
                              {family.siblings.length > 1 && (
                                <span className="ml-2 text-xs text-gray-400 font-normal">
                                  ({family.siblings.length} clients)
                                </span>
                              )}
                            </td>

                            {/* Clients preview (collapsed = show all names comma-separated) */}
                            <td className="text-[13px] px-4 text-gray-600">
                              {isOpen
                                ? <span className="text-gray-300 text-xs italic">see below ↓</span>
                                : family.siblings.map((s) => s.fullName).join(", ")
                              }
                            </td>

                            {/* Care Category */}
                            <td className="text-[13px] px-4">{family.careCategory || "—"}</td>

                            {/* Status */}
                            <td className="text-[13px] px-4" onClick={(e) => e.stopPropagation()}>
                              <StatusBadge status={family.status} />
                            </td>

                            {/* View Intake Form */}
                            <td className="text-[13px] px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="text-dark-green font-medium hover:underline text-[13px]"
                                onClick={() => navigate(`/intake-form/update-intake-form/${family.id}`)}
                              >
                                View Intake Form
                              </button>
                            </td>

                            {/* File Closure */}
                            <td className="text-[13px] px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <span
                                className="text-dark-green font-medium hover:underline cursor-pointer"
                                onClick={() => {
                                  setSelectedClosureClient(family);
                                  setClosureSliderOpen(true);
                                }}
                              >
                                File Closure
                              </span>
                            </td>

                            {/* Shift Reports */}
                            <td className="text-[13px] px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              {familyShifts.length > 0 ? (
                                <button
                                  className="text-white bg-dark-green px-3 py-1 rounded text-xs hover:opacity-90"
                                  onClick={() => setReportModal({ open: true, shifts: familyShifts, familyName: family.familyName })}
                                >
                                  Reports ({familyShifts.length})
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">No Access</span>
                              )}
                            </td>
                          </tr>

                          {/* ── Sibling detail rows (expanded) ── */}
                          {isOpen && family.siblings.map((sib, i) => (
                            <tr key={i} className="h-[44px] bg-green-50 border-t border-green-100">
                              <td className="px-4"></td>
                              <td className="px-4 text-[12px] text-gray-500 font-medium pl-8">
                                └─
                              </td>
                              <td className="px-4 text-[13px] font-medium text-light-black">
                                {sib.fullName}
                              </td>
                              <td className="px-4 text-[12px] text-gray-500">
                                {sib.birthDate ? `DOB: ${sib.birthDate}` : ""}
                              </td>
                              <td className="px-4 text-[12px] text-gray-400 truncate max-w-[200px]" colSpan={3}>
                                {sib.address}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex justify-end items-center mt-4 gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50">«</button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border border-[#C5C5C5] rounded ${currentPage === page ? "bg-light-green text-white" : ""}`}
                    >{page}</button>
                  ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 border border-[#C5C5C5] rounded disabled:opacity-50">»</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Shift Reports Modal ── */}
      {reportModal.open && !selectedShiftReport && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setReportModal({ open: false, shifts: [], familyName: "" })} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 pointer-events-auto max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-light-black">Shift Reports — {reportModal.familyName}</h3>
                <button onClick={() => setReportModal({ open: false, shifts: [], familyName: "" })} className="text-gray-500 hover:text-gray-700 font-bold text-xl">✕</button>
              </div>
              {reportModal.shifts.length === 0 ? (
                <p className="text-gray-500">No reports found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {reportModal.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="border border-light-gray rounded p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => setSelectedShiftReport(shift)}
                    >
                      <div>
                        <p className="font-semibold text-sm text-light-black">{formatDate(shift.startDate)}</p>
                        <p className="text-xs text-gray-500">{shift.startTime} – {shift.endTime}</p>
                        <p className="text-xs text-gray-400 capitalize">{shift.shiftType || "Shift"}</p>
                      </div>
                      <span className="text-dark-green text-xs font-bold">View →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Single Shift Report Modal (View Only) ── */}
      {selectedShiftReport && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { setSelectedShiftReport(null); setShiftReportTab("reports"); }} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4 w-full h-full">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col pointer-events-auto relative">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200 flex-shrink-0">
                <p className="font-bold text-[18px] text-light-black">Shift Report</p>
                <button
                  onClick={() => { setSelectedShiftReport(null); setShiftReportTab("reports"); }}
                  className="text-gray-500 hover:text-black font-bold text-xl"
                >✕</button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-6 pt-3 flex-shrink-0 border-b border-gray-100">
                {["reports", "serviceplan", "transportation"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setShiftReportTab(tab); if (tab === "serviceplan") setServicePlanStep("observations"); }}
                    className={`px-4 py-2 text-sm font-semibold rounded-t capitalize transition-colors ${
                      shiftReportTab === tab
                        ? "bg-dark-green text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab === "serviceplan" ? "Service Plan" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {shiftReportTab === "reports" && (
                  <ReportsSection shiftId={selectedShiftReport.id} shiftData={selectedShiftReport} user={user} readOnly={true} />
                )}
                {shiftReportTab === "serviceplan" && (
                  <ServicePlanForm
                    shiftId={selectedShiftReport.id}
                    shiftData={selectedShiftReport}
                    step={servicePlanStep}
                    onStepChange={(newStep) => setServicePlanStep(newStep)}
                  />
                )}
                {shiftReportTab === "transportation" && (
                  <AddTransportation shiftId={selectedShiftReport.id} shiftData={selectedShiftReport} />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {closureSliderOpen && (
        <FileClosureSlider
          isOpen={closureSliderOpen}
          onClose={() => setClosureSliderOpen(false)}
          selectedClient={selectedClosureClient}
        />
      )}
    </div>
  );
};

export default IntakeFormDashboard;
