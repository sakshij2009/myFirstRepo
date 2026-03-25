import { Stack, Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text } from "react-native";

const PRIMARY_GREEN = "#1F6F43";
const GRAY_TEXT = "#9CA3AF";

export default function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await AsyncStorage.getItem("user");
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, [pathname]);

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
      </Stack>
    );
  }

  const CustomTabIcon = ({ name, focused }) => (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? PRIMARY_GREEN : GRAY_TEXT}
      />
      {focused && (
        <View style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: PRIMARY_GREEN,
          marginTop: 4,
        }} />
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY_GREEN,
        tabBarInactiveTintColor: GRAY_TEXT,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
          elevation: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          fontFamily: "Inter",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <CustomTabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: "Shifts",
          tabBarIcon: ({ focused }) => <CustomTabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: "Routes",
          tabBarIcon: ({ focused }) => <CustomTabIcon name="navigate" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarBadge: 3,
          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            fontSize: 9,
            fontWeight: "bold",
            minWidth: 16,
            height: 16,
            borderRadius: 8,
          },
          tabBarIcon: ({ focused }) => <CustomTabIcon name="notifications" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <CustomTabIcon name="person" focused={focused} />,
        }}
      />

      {/* Explicitly hide all auto-generated non-tab screens */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="_ActionCard" options={{ href: null }} />
      <Tabs.Screen name="_Availability" options={{ href: null }} />
      <Tabs.Screen name="_IntakeView" options={{ href: null }} />
      <Tabs.Screen name="_MedicationTab" options={{ href: null }} />
      <Tabs.Screen name="_ReportTransportationTab" options={{ href: null }} />
      <Tabs.Screen name="_TransferShiftModal" options={{ href: null }} />
      <Tabs.Screen name="_employee-card" options={{ href: null }} />
      <Tabs.Screen name="_report" options={{ href: null }} />
      <Tabs.Screen name="_shift-details" options={{ href: null }} />
    </Tabs>
  );
}
