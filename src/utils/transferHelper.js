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

  const transferRef = doc(db, "dev_transferRequests", transferId);
  const transferSnap = await getDoc(transferRef);

  if (!transferSnap.exists()) throw new Error("Transfer request not found");
  if (transferSnap.data().status !== "pending") return;

  // 1️⃣ Look up the receiving staff member's full profile so every staff-identity
  // field on the shift (not just userId/userName) points at the new assignee —
  // otherwise screens that read the stale `name`/`primaryUserId` fields keep
  // showing the outgoing staff member.
  const toUserSnap = await getDoc(doc(db, "dev_users", toUserId));
  const toUser = toUserSnap.exists() ? toUserSnap.data() : {};
  const resolvedUserId = toUser.userId ?? toUserId;
  const resolvedName = toUser.name || toUserName || "";

  const shiftRef = doc(db, "dev_shifts", shiftId);
  const shiftSnap = await getDoc(shiftRef);
  const shiftData = shiftSnap.exists() ? shiftSnap.data() : {};

  const shiftUpdate = {
    userId: resolvedUserId,
    userName: resolvedName,
    name: resolvedName,
    username: toUser.username || resolvedName,
    phone: toUser.phone || "",
    email: toUser.email || "",
    primaryUserId: toUserId,
    primaryUserName: resolvedName,
  };

  // If the outgoing staff member was also recorded as secondary staff on this
  // shift, clear it — otherwise they'd keep matching the mobile app's
  // secondary-staff "my shifts" query after being transferred off the shift.
  if (
    shiftData.secondaryUserId === fromUserId ||
    shiftData.secondaryUserDocId === fromUserId ||
    (fromUserName && shiftData.secondaryUserName === fromUserName)
  ) {
    shiftUpdate.secondaryUserId = "";
    shiftUpdate.secondaryUserDocId = "";
    shiftUpdate.secondaryUserName = "";
  }

  // 2️⃣ Update shift owner
  await updateDoc(shiftRef, shiftUpdate);

  // 3️⃣ Update transfer request
  await updateDoc(transferRef, {
    status: "approved",
    resolvedAt: Timestamp.now(),
  });

  // 4️⃣ Notify ORIGINAL SENDER ✅
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

  await updateDoc(doc(db, "dev_transferRequests", transferId), {
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

