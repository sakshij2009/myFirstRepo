import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminTabsLayout() {
    // Respect the device's bottom inset (Android nav buttons / gesture bar, iOS home indicator)
    const insets = useSafeAreaInsets();
    const bottomInset = insets.bottom || 0;
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2D5F3F",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopWidth: 1,
                    borderTopColor: "#e5e7eb",
                    height: 60 + bottomInset,
                    paddingBottom: 8 + bottomInset,
                    paddingTop: 6,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "500",
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bar-chart" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="clients"
                options={{
                    title: "Clients",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="shifts"
                options={{
                    title: "Shifts",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar" size={22} color={color} />
                    ),
                }}
            />
            {/* Finance hidden for now (code kept, just not shown in the tab bar) */}
            <Tabs.Screen name="finance" options={{ href: null }} />
            <Tabs.Screen
                name="intake-forms"
                options={{
                    title: "Intake",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: "More",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="ellipsis-horizontal" size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
