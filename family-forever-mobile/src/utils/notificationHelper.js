import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Sends a notification to a specific user
 * Firestore path: notifications/{userId}/userNotifications/{notifId}
 *
 * @param {string} receiverId - The user who should receive the notification
 * @param {Object} payload - Notification details
 * @param {"info"|"request"} payload.type - Notification type
 * @param {string} payload.title - Notification title
 * @param {string} payload.message - Notification message
 * @param {string} payload.senderId - ID of the sender (current user)
 * @param {Object} payload.meta - Extra data like agencyId, shiftId, etc.
 */
export const sendNotification = async (receiverId, payload) => {
  try {
    const notifRef = collection(db, "notifications", receiverId, "userNotifications");

    await addDoc(notifRef, {
      ...payload,
      read: false,              // for red dot tracking
      status: "pending",        // you can update later to "approved"/"declined" etc.
      timestamp: serverTimestamp(),
    });

    console.log("✅ Notification sent successfully to", receiverId);
  } catch (err) {
    console.error("❌ Error sending notification:", err); 
  }
};
