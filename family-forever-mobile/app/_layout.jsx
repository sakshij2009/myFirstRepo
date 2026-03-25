import { Stack, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text } from "react-native";

const PRIMARY_GREEN = "#1F6F43";
const GRAY_TEXT = "#9CA3AF";

export default function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await AsyncStorage.getItem("user");
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

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
    focused ? (
      <View style={{
        backgroundColor: "#F0FDF4",
        width: 48,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
      }}>
        <Ionicons name={name} size={24} color={PRIMARY_GREEN} />
      </View>
    ) : (
      <Ionicons
        name={`${name}-outline`}
        size={24}
        color={GRAY_TEXT}
        style={{ marginTop: 4 }}
      />
    )
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY_GREEN,
        tabBarInactiveTintColor: GRAY_TEXT,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1,
          height: 80, // Needs sufficient height
          paddingBottom: 24, // Keep labels above the home indicator
          paddingTop: 8,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 4,
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
          tabBarIcon: ({ focused }) => (
            focused ? (
              <View style={{
                backgroundColor: "#F0FDF4",
                width: 48,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
              }}>
                <Ionicons name={"navigate"} size={24} color={PRIMARY_GREEN} />
              </View>
            ) : (
              <Ionicons
                name={"navigate-outline"}
                size={24}
                color={GRAY_TEXT}
                style={{ marginTop: 4 }}
              />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarBadge: 2,
          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
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
      <Tabs.Screen name="_Availability" options={{ href: null }} />
      <Tabs.Screen name="_IntakeView" options={{ href: null }} />
      <Tabs.Screen name="_MedicationTab" options={{ href: null }} />
      <Tabs.Screen name="_ReportTransportationTab" options={{ href: null }} />
      <Tabs.Screen name="_TransferShiftModal" options={{ href: null }} />
      <Tabs.Screen name="_employee-card" options={{ href: null }} />
      <Tabs.Screen name="_report" options={{ href: null }} />
    </Tabs>
  );
}
