import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { sendNotification } from "../../src/utils/notificationHelper";

export const requestShiftTransfer = async ({
  shift,
  fromUser,
  toStaff,
  reason,
}) => {
  const transferRef = await addDoc(collection(db, "transferRequests"), {
    shiftId: shift.id,
    fromUserId: fromUser.userId,
    fromUserName: fromUser.name,
    toUserId: toStaff.id,
    toUserName: toStaff.name || toStaff.email,
    reason: reason || "",
    status: "pending",
    createdAt: Timestamp.now(),
  });

  const transferId = transferRef.id;

  // Notify receiving staff
  await sendNotification(toStaff.id, {
    type: "request",
    title: "Shift Transfer Request",
    message: `${fromUser.name} wants to transfer a shift to you.`,
    meta: {
      requestType: "shift-transfer",
      transferId,
      shiftId: shift.id,
      fromUserId: fromUser.userId,
      fromUserName: fromUser.name,
      toUserId: toStaff.id,
      toUserName: toStaff.name,
    },
  });

  // Notify admin
  const adminSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "admin"))
  );

  if (!adminSnap.empty) {
    await sendNotification(adminSnap.docs[0].id, {
      type: "info",
      title: "Shift Transfer Requested",
      message: `${fromUser.name} requested a shift transfer.`,
      meta: { transferId, shiftId: shift.id },
    });
  }
};
