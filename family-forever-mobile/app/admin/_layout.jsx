import { Stack } from "expo-router";

export default function AdminLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* Tab navigator group (Dashboard, Clients, Shifts, Finance, More) */}
            <Stack.Screen name="(tabs)" />

            {/* Push screens (no tab bar visible) */}
            <Stack.Screen name="add-client" />
            <Stack.Screen name="edit-client" />
            <Stack.Screen name="agencies" />
            <Stack.Screen name="agency-details" />
            <Stack.Screen name="add-agency" />
            <Stack.Screen name="shift-report" options={{ headerShown: false }} />
            <Stack.Screen name="staff" />
            <Stack.Screen name="intake-workers" />
            <Stack.Screen name="intake-forms" />
            <Stack.Screen name="intake-form-view" />
            <Stack.Screen name="add-intake-form" />
            <Stack.Screen name="add-shift" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
