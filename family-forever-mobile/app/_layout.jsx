import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";

// Enable foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="home" />
      <Stack.Screen name="report" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="Availability" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
