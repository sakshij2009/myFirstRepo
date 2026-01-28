// src/utils/transferHelper.js
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { sendNotification } from "./notificationHelper";


export const approveTransfer = async (meta) => {
  const {
    transferId,
    shiftId,
    toUserId,
    toUserName,
    fromUserId,
    fromUserName,
  } = meta;

  if (!transferId || !shiftId || !toUserId || !fromUserId) {
    throw new Error("Invalid transfer meta data");
  }

  const transferRef = doc(db, "transferRequests", transferId);
  const transferSnap = await getDoc(transferRef);

  if (!transferSnap.exists()) throw new Error("Transfer request not found");
  if (transferSnap.data().status !== "pending") return;

  // 1️⃣ Update shift owner
  await updateDoc(doc(db, "shifts", shiftId), {
    userId: toUserId,
    userName: toUserName,
  });

  // 2️⃣ Update transfer request
  await updateDoc(transferRef, {
    status: "approved",
    resolvedAt: Timestamp.now(),
  });

  // 3️⃣ Notify ORIGINAL SENDER ✅
  await sendNotification(fromUserId, {
    type: "info",
    title: "Shift Transfer Approved",
    message: `${toUserName} has approved your shift transfer request.`,
    meta: {
      requestType: "shift-transfer",
      transferId,
      shiftId,
      status: "approved",
    },
  });
};


export const rejectTransfer = async (transferId, meta) => {
  if (!transferId || !meta?.fromUserId) {
    throw new Error("Invalid reject data");
  }

  await updateDoc(doc(db, "transferRequests", transferId), {
    status: "rejected",
    resolvedAt: Timestamp.now(),
  });

  // 🔔 Notify ORIGINAL SENDER
  await sendNotification(meta.fromUserId, {
    type: "info",
    title: "Shift Transfer Rejected",
    message: `${meta.toUserName} has rejected your shift transfer request.`,
    meta: {
      requestType: "shift-transfer",
      transferId,
      status: "rejected",
    },
  });
};

