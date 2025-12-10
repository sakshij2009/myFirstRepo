import { useRef, useState, useEffect } from "react";
import { IoNotificationsCircle } from "react-icons/io5";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
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

// ✅ Helper: get date range for filter
const getDateRange = (filter) => {
  const now = new Date();
  if (filter === "weekly") return { start: startOfWeek(now), end: endOfWeek(now) };
  if (filter === "monthly") return { start: startOfMonth(now), end: endOfMonth(now) };
  if (filter === "yearly") return { start: startOfYear(now), end: endOfYear(now) };
  return { start: null, end: null };
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("shifts");
  const scrollRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [filter, setFilter] = useState("weekly");
  const [stats, setStats] = useState({
    clients: 0,
    shifts: 0,
    revenue: 0,
    expenses: 0,
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [userDocId, setUserDocId] = useState("familyforeverAdmin#1"); 

const [showTransportDetails, setShowTransportDetails] = useState(false);
const [selectedTransportShift, setSelectedTransportShift] = useState(null);


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

  const fetchStats = async (filter) => {
    try {
      const { start, end } = getDateRange(filter);

      const clientQuery = query(
        collection(db, "dev_clients"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const clientSnap = await getDocs(clientQuery);

      const shiftQuery = query(
        collection(db, "dev_shifts"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const shiftSnap = await getDocs(shiftQuery);

      const revenueQuery = query(
        collection(db, "revenue"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const revenueSnap = await getDocs(revenueQuery);
      const totalRevenue = revenueSnap.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      const expenseQuery = query(
        collection(db, "expenses"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const expenseSnap = await getDocs(expenseQuery);
      const totalExpenses = expenseSnap.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      setStats({
        clients: clientSnap.size,
        shifts: shiftSnap.size,
        revenue: totalRevenue,
        expenses: totalExpenses,
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
          activeTab={activeTab}
          handleOpenForm={handleOpenForm}
          handleViewReport={handleViewReport}
          openTransportDetails={openTransportDetails}
        />
      </div>

      {/* ✅ Notification Slider */}
      {showNotifications && (
        <div
          className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-lg z-50 transform transition-transform duration-500 ${
            showNotifications ? "translate-x-0" : "translate-x-full"
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
          className={`fixed top-0 right-0 h-full w-[450px] bg-white shadow-lg z-50 transform transition-transform duration-500 ${
            showTransportDetails ? "translate-x-0" : "translate-x-full"
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
