import React, { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase"; // make sure path is correct
import RequestNotificationCard from "./RequestNotificationCard";
import InfoNotificationCard from "./InfoNotificationCard";
import { useNavigate } from "react-router-dom";

const NotificationSlider = ({ onClose, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

// Fetch notifications in real-time
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications", userId, "userNotifications"),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifs.filter(n => !n.read)); // ⬅️ REMOVE READ ONES
    });

    return () => unsub();
  }, [userId]);

  // ========== NORMAL NOTIFICATION ==========
  const handleMarkRead = async (notifId) => {
    const ref = doc(db, "notifications", userId, "userNotifications", notifId);
    await updateDoc(ref, { read: true });

    // Remove from UI immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  // ========== REQUEST NOTIFICATIONS ==========
  const handleRequestAction = async (notif, action) => {
    const notifId = notif.id;

    // Detect request type
    const requestType = notif?.meta?.requestType;

    // 1️⃣ If it's a LEAVE REQUEST
    if (requestType === "leave") {
      const leaveId = notif.meta.leaveId;

      const leaveRef = doc(db, "leaveRequests", leaveId);

      await updateDoc(leaveRef, {
        status: action === "approve" ? "approved" : "declined",
      });
    }

    // 2️⃣ TRANSFER SHIFT (example)
    if (requestType === "transferShift") {
      const shiftId = notif.meta.shiftId;

      const shiftRef = doc(db, "shifts", shiftId);

      await updateDoc(shiftRef, {
        status: action === "approve" ? "approved" : "declined",
      });
    }

    // 🔥 Mark the notification itself as handled
    const notifRef = doc(
      db,
      "notifications",
      userId,
      "userNotifications",
      notifId
    );

    await updateDoc(notifRef, {
      read: true,
      status: action === "approve" ? "approved" : "declined",
    });

    // Remove it from UI
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const handleApprove = (notif) => handleRequestAction(notif, "approve");
  const handleDecline = (notif) => handleRequestAction(notif, "decline");

  const handleViewDetails = (notif) => {
  if (!notif?.meta) return;

  const { entity } = notif.meta;

  switch (entity) {

    case "Agency":
      // Go to Manage Agency → Update Agency page
      navigate("/admin-dashboard/agency");
      break;

    case "Client":
      // Go to Manage Client → Update Client page
      navigate("/admin-dashboard/clients");
      break;

    case "User":
      // Go to Manage User → Update User page
      navigate("/admin-dashboard/users");
      break;

    case "Shift":
      // Go to view shift page
      window.location.href = `/admin-dashboard`;
      break;

    default:
      console.warn("Unknown entity type", entity);
      break;
  }
};


  return (
    <div className="flex flex-col h-full p-6 bg-white shadow-lg rounded-l-xl">
      <div className="flex justify-between items-center border-b pb-3 mb-4">
        <h2 className="text-2xl font-bold">Notifications</h2>
        <button onClick={onClose}>
          <IoClose className="text-2xl hover:text-red-500 transition-colors" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 space-y-4 ">
        {notifications.length === 0 && (
          <p className="text-gray-500 text-center mt-10">No notifications</p>
        )}

        {notifications.map((notif) =>
          notif.type === "request" ? (
            <RequestNotificationCard
              key={notif.id}
              notif={notif}
              onApprove={() => handleApprove(notif)}
              onDecline={() => handleDecline(notif)}
            />
          ) : (
            <InfoNotificationCard
              key={notif.id}
              notif={notif}
              onMarkRead={() => handleMarkRead(notif.id)}
              onViewDetails={()=>handleViewDetails(notif)}
            />
          )
        )}
      </div>
    </div>
  );
};

export default NotificationSlider;
