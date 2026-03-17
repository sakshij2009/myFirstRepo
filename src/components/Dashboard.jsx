import { useRef, useState, useEffect } from "react";
import { IoNotificationsCircle } from "react-icons/io5";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import DashboardContentPage from "./DashboardContentPage";
import NotificationSlider from "./NotificationSlider";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import TransportationDetails from "./TransportationDetails";
import { useLocation } from "react-router-dom";
import { checkDriverLicenseExpiry } from "../utils/driverLicenseExpiryChecker";


// ✅ Helper: get date range for filter
const getDateRange = (filter, now) => {
  const ref = now || new Date();
  if (filter === "weekly") return { start: startOfWeek(ref), end: endOfWeek(ref) };
  if (filter === "monthly") return { start: startOfMonth(ref), end: endOfMonth(ref) };
  if (filter === "yearly") return { start: startOfYear(ref), end: endOfYear(ref) };
  return { start: null, end: null };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [initialShiftCategory, setInitialShiftCategory] = useState(null);

  const [activeTab, setActiveTab] = useState("shifts");
  const scrollRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [filter, setFilter] = useState("weekly");
  const [stats, setStats] = useState({
    clients: 0,
    shifts: 0,
    agencies: 0,
    revenue: 0,
    expenses: 0,
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [userDocId, setUserDocId] = useState("familyforeverAdmin#1");

  const [showTransportDetails, setShowTransportDetails] = useState(false);
  const [selectedTransportShift, setSelectedTransportShift] = useState(null);
  const [migratingShifts, setMigratingShifts] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);


  useEffect(() => {
    if (location.state?.shiftCategory) {
      setInitialShiftCategory(location.state.shiftCategory);
    }
  }, [location.state]);



  // OPEN TRANSPORT SLIDER
  const openTransportDetails = (shift) => {
    setSelectedTransportShift(shift);
    setShowTransportDetails(true);
  };

  // CLOSE TRANSPORT SLIDER
  const closeTransportDetails = () => {
    setShowTransportDetails(false);
    setTimeout(() => setSelectedTransportShift(null), 300);
  };



  // 🔔 Driver License Expiry: run every time admin loads (only fires work on Mondays)
  useEffect(() => {
    checkDriverLicenseExpiry();
  }, []);

  // 🔴 Real-time listener for unread notifications
  useEffect(() => {
    const q = query(
      collection(db, "notifications", userDocId, "userNotifications"),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setHasUnread(snapshot.docs.length > 0);
    });

    return () => unsub();
  }, [userDocId]);



  // ✅ Fetch stats whenever filter changes
  useEffect(() => {
    fetchStats(filter);
  }, [filter]);

  // ✅ Robust date extractor (handles Firestore Timestamps, Date objects, strings, {seconds} objects)
  const extractDate = (val) => {
    if (!val) return null;
    // Firestore Timestamp
    if (typeof val.toDate === "function") return val.toDate();
    // Already a Date
    if (val instanceof Date && !isNaN(val)) return val;
    // Object with seconds (Firestore-like)
    if (typeof val === "object" && val.seconds) return new Date(val.seconds * 1000);
    // String
    if (typeof val === "string") {
      const cleaned = val.replace(/,/g, "").replace(/\s+/g, " ").trim();
      const parsed = Date.parse(cleaned);
      if (!isNaN(parsed)) return new Date(parsed);
      // Try "05 DEC 2024" style
      const parts = cleaned.split(" ");
      if (parts.length >= 3) {
        const [day, month, year] = parts;
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        if (!isNaN(monthIndex)) return new Date(Number(year), monthIndex, Number(day));
      }
    }
    return null;
  };

  const fetchStats = async (currentFilter) => {
    try {
      // Get Alberta "now" for date range
      const nowStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" });
      const [y, m, d] = nowStr.split("-").map(Number);
      const albertaNow = new Date(y, m - 1, d, 12, 0, 0); // noon to avoid boundary issues

      const { start, end } = getDateRange(currentFilter, albertaNow);

      // Fetch all from real collections
      const [clientSnap, shiftSnap, agencySnap] = await Promise.all([
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "shifts")),
        getDocs(collection(db, "agencies")),
      ]);

      // Client-side date filtering for shifts
      const allShifts = shiftSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredShifts = allShifts.filter(shift => {
        const shiftDate = extractDate(shift.startDate) || extractDate(shift.createdAt);
        if (!shiftDate) return false;
        return shiftDate >= start && shiftDate <= end;
      });

      // Client-side date filtering for clients
      const allClients = clientSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredClients = allClients.filter(client => {
        const clientDate = extractDate(client.createdAt);
        if (!clientDate) return true; // If no createdAt, include by default
        return clientDate >= start && clientDate <= end;
      });

      setStats({
        clients: filteredClients.length,
        shifts: filteredShifts.length,
        agencies: agencySnap.size, // Total agencies (not date-filtered)
        revenue: 0,
        expenses: 0,
      });

      console.log(`📊 ADMIN ANALYTICS [${currentFilter}]`, {
        period: `${start.toLocaleDateString()} → ${end.toLocaleDateString()}`,
        totalClients: filteredClients.length,
        totalShifts: filteredShifts.length,
        totalAgencies: agencySnap.size,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ✅ Scroll drag
  const handleMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);
  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // ✅ One-time utility: set accessToShiftReport=true on all old emergent care shifts
  const migrateEmergentCareShifts = async () => {
    if (!window.confirm("This will enable shift report access for ALL existing Emergent Care shifts. Continue?")) return;
    setMigratingShifts(true);
    setMigrationResult(null);
    try {
      const snap = await getDocs(collection(db, "shifts"));
      const emergentShifts = snap.docs.filter((d) => {
        const data = d.data();
        const cat = (data.categoryName || data.shiftCategory || "").toLowerCase();
        return cat.includes("emergent") && !data.accessToShiftReport;
      });
      await Promise.all(
        emergentShifts.map((d) => updateDoc(doc(db, "shifts", d.id), { accessToShiftReport: true }))
      );
      setMigrationResult(`Done — updated ${emergentShifts.length} shift(s).`);
    } catch (err) {
      console.error(err);
      setMigrationResult("Error: " + err.message);
    } finally {
      setMigratingShifts(false);
    }
  };

  // ✅ Navigation handlers (replaces handleOpenForm, handleViewReport)
  const handleOpenForm = () => navigate("/admin-dashboard/clients");
  const handleViewReport = () => navigate("/admin-dashboard/reports");

  return (
    <div className="flex flex-col gap-4  bg-[#EEEEEE] h-full w-full relative">
      {/* Header */}
      <div className="flex justify-between text-light-black flex-wrap gap-3">
        <div className="flex items-center flex-wrap">
          <h3 className="font-bold text-[24px] leading-[28px] tracking-[-0.24px]">
            Business Analytics
          </h3>
        </div>

        {/* Filter + Notification */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-[8px] items-center flex-wrap">
            <p className="font-bold text-[16px] leading-[24px]">Filter</p>
            <select
              className="border-[2px] rounded-[6px] font-medium text-[14px] leading-[20px] focus:outline-none text-light-green p-1"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* 🔔 Notification Icon */}
          <div
            onClick={() => setShowNotifications(true)}
            className="cursor-pointer relative"
          >
            <IoNotificationsCircle className="h-8 w-8 text-dark-green hover:scale-110 transition-transform duration-200" />
            {hasUnread && (
              <span className="absolute top-1 right-1 bg-red-500 rounded-full w-3 h-3 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div
        ref={scrollRef}
        className="flex overflow-x-scroll gap-[29px] scrollbar-hide select-none h-[78px] shrink-0"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {[
          { title: "Total Clients", value: stats.clients },
          { title: "Total Shifts", value: stats.shifts },
          { title: "Total Agencies", value: stats.agencies },
          { title: "Total Revenue", value: `$${stats.revenue}` },
          { title: "Total Expenses", value: `$${stats.expenses}` },
        ].map((card, idx) => (
          <div
            key={idx}
            className="flex flex-col bg-white min-w-[180px] sm:min-w-[220px] md:min-w-[251px] h-[78px] gap-[7px] rounded-[8px] border border-gray p-[10px] flex-shrink-0"
          >
            <div className="flex gap-[8px]">
              <img src="/images/people.png" alt="" className="w-[16px] h-[16px]" />
              <h3 className="font-normal text-[12px] leading-[16px]">
                {card.title}
              </h3>
            </div>
            <div className="flex justify-between items-center w-full">
              <p className="font-bold text-[32px] leading-[36px] text-light-black">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-t border-gray-300" />

      {/* Dashboard Content */}
      <div className="bg-[#E4E4E4] gap-4 pt-4 pr-6 pb-4 pl-6 rounded-[4px] h-full min-h-[600px] w-full">
        <DashboardContentPage
          // activeTab={activeTab}
          key={initialShiftCategory || "default"}
          handleOpenForm={handleOpenForm}
          handleViewReport={handleViewReport}
          openTransportDetails={openTransportDetails}
          initialShiftCategory={initialShiftCategory}
        />
      </div>

      {/* ✅ Notification Slider */}
      {showNotifications && (
        <div
          className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-lg z-50 transform transition-transform duration-500 ${showNotifications ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <NotificationSlider
            onClose={() => setShowNotifications(false)}
            userId={userDocId}
          />
        </div>
      )}
      {/* ✅ TRANSPORTATION DETAILS SLIDER */}
      {showTransportDetails && (
        <div
          className={`fixed top-0 right-0 h-full w-[450px] bg-white shadow-lg z-50 transform transition-transform duration-500 ${showTransportDetails ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <TransportationDetails
            shift={selectedTransportShift}
            onClose={closeTransportDetails}
          />
        </div>
      )}

    </div>
  );
};

export default Dashboard;
