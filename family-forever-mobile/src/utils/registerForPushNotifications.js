import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function registerForPushNotifications(userId) {
  if (!Device.isDevice) {
    console.log("❌ Must use physical device for push notifications");
    return;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("❌ Push permission not granted");
    return;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync()
  ).data;

  console.log("📲 Push Token:", token);
  console.log(`[DEBUG] Updating Push Token for UserID: ${userId}`);

  // Save token in Firestore
  await updateDoc(doc(db, "users", String(userId)), {
    expoPushToken: token,
  });

  return token;
}
