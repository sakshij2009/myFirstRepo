import React, { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import RequestNotificationCard from "./RequestNotificationCard";
import InfoNotificationCard from "./InfoNotificationCard";
import { useNavigate } from "react-router-dom";
import { approveTransfer, rejectTransfer } from "../utils/transferHelper";
import { sendNotification } from "../utils/notificationHelper";

const NotificationSlider = ({ onClose, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  /* ================= FETCH NOTIFICATIONS ================= */
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications", userId, "userNotifications"),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setNotifications(notifs.filter((n) => !n.read));
    });

    return () => unsub();
  }, [userId]);

  /* ================= MARK READ ================= */
  const handleMarkRead = async (notifId) => {
    const ref = doc(db, "notifications", userId, "userNotifications", notifId);
    await updateDoc(ref, { read: true });
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  /* ================= APPROVE / DECLINE ================= */
  const handleRequestAction = async (notif, action) => {
    const notifId = notif.id;
    const requestType = notif?.meta?.requestType;

    /* ========= LEAVE REQUEST ========= */
    if (requestType === "leave") {
      const {
        leaveId,
        leaveType,
        startDate,
        endDate,
        userId: staffId,
      } = notif.meta;

      // 1️⃣ Update leave request status
      await updateDoc(doc(db, "leaveRequests", leaveId), {
        status: action === "approve" ? "approved" : "declined",
        actionedAt: new Date(),
      });

      // 2️⃣ If approved → update leave balance
      if (action === "approve") {
        const start =
          startDate?.toDate?.() || new Date(startDate);
        const end =
          endDate?.toDate?.() || new Date(endDate);

        const days =
          Math.floor(
            (end.getTime() - start.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;

        const leaveKey = leaveType.toLowerCase();

        await updateDoc(doc(db, "users", staffId), {
          [`leaveBalance.${leaveKey}.used`]: increment(days),
          [`leaveBalance.${leaveKey}.remaining`]: increment(-days),
        });

        // 3️⃣ Notify staff (approved)
        await sendNotification(staffId, {
          type: "info",
          title: "Leave Approved",
          message: `Your ${leaveType} leave has been approved.`,
          meta: {
            requestType: "leave",
            leaveId,
            status: "approved",
          },
        });
      } else {
        // 4️⃣ Notify staff (declined)
        await sendNotification(staffId, {
          type: "info",
          title: "Leave Rejected",
          message: `Your ${leaveType} leave has been rejected.`,
          meta: {
            requestType: "leave",
            leaveId,
            status: "declined",
          },
        });
      }
    }

    /* ========= SHIFT TRANSFER ========= */
    if (requestType === "shift-transfer") {
      if (action === "approve") {
        await approveTransfer(notif.meta);
      } else {
        await rejectTransfer(notif.meta.transferId, notif.meta);
      }
    }

    /* ========= MARK NOTIFICATION HANDLED ========= */
    await updateDoc(
      doc(db, "notifications", userId, "userNotifications", notifId),
      {
        read: true,
        status: action === "approve" ? "approved" : "declined",
      }
    );

    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const handleApprove = (notif) => handleRequestAction(notif, "approve");
  const handleDecline = (notif) => handleRequestAction(notif, "decline");

  /* ================= VIEW DETAILS ================= */
  const handleViewDetails = (notif) => {
    if (!notif?.meta) return;

    switch (notif.meta.entity) {
      case "Agency":
        navigate("/admin-dashboard/agency");
        break;
      case "Client":
        navigate("/admin-dashboard/clients");
        break;
      case "User":
        navigate("/admin-dashboard/users");
        break;
      case "Shift":
        navigate("/admin-dashboard");
        break;
      default:
        console.warn("Unknown entity", notif.meta.entity);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="flex flex-col h-full p-6 bg-white shadow-lg rounded-l-xl">
      <div className="flex justify-between items-center border-b pb-3 mb-4">
        <h2 className="text-2xl font-bold">Notifications</h2>
        <button onClick={onClose}>
          <IoClose className="text-2xl hover:text-red-500" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 space-y-4">
        {notifications.length === 0 && (
          <p className="text-gray-500 text-center mt-10">
            No notifications
          </p>
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
              onViewDetails={() => handleViewDetails(notif)}
            />
          )
        )}
      </div>
    </div>
  );
};

export default NotificationSlider;
