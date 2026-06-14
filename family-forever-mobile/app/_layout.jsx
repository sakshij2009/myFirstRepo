import { Stack, Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Expo Router uses this to catch render errors in any route → friendly screen
// instead of a blank white screen.
export function ErrorBoundary({ error, retry }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 8 }}>Something went wrong</Text>
      <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
        The screen ran into a problem. Please try again.
      </Text>
      <Pressable onPress={retry} style={{ backgroundColor: "#1F6F43", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 }}>
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Try Again</Text>
      </Pressable>
    </View>
  );
}
import * as SplashScreen from "expo-splash-screen";
import { 
  useFonts, 
  Poppins_400Regular, 
  Poppins_600SemiBold, 
  Poppins_700Bold, 
  Poppins_800ExtraBold 
} from "@expo-google-fonts/poppins";
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

const PRIMARY_GREEN = "#1F6F43";
const GRAY_TEXT = "#9CA3AF";

export default function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const pathname = usePathname();

  const [fontsLoaded] = useFonts({
    Poppins: Poppins_400Regular,
    "Poppins-SemiBold": Poppins_600SemiBold,
    "Poppins-Bold": Poppins_700Bold,
    "Poppins-ExtraBold": Poppins_800ExtraBold,
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const user = await AsyncStorage.getItem("user");
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || isLoggedIn === null) return null;

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
      {focused && (
        <View style={{
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: PRIMARY_GREEN,
          marginBottom: 4,
        }} />
      )}
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? PRIMARY_GREEN : GRAY_TEXT}
      />
    </View>
  );

  // Admin/owner section has its own navigator + tab bar — hide the staff
  // tab bar whenever we're inside an /admin route.
  const isAdminRoute = pathname?.startsWith("/admin");
  // Respect the device's bottom inset (Android nav buttons, iOS home indicator)
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY_GREEN,
        tabBarInactiveTintColor: GRAY_TEXT,
        tabBarStyle: isAdminRoute ? { display: "none" } : {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12),
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
      <Tabs.Screen name="routes" options={{ href: null }} />
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
      <Tabs.Screen name="admin" options={{ href: null }} />
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

      {/* New screens — hidden from tab bar */}
      <Tabs.Screen name="agency" options={{ href: null }} />
      <Tabs.Screen name="shift-detail" options={{ href: null }} />
      <Tabs.Screen name="client-detail" options={{ href: null }} />
      <Tabs.Screen name="geo-checkin" options={{ href: null }} />
      <Tabs.Screen name="geo-checkout" options={{ href: null }} />
      <Tabs.Screen name="gps-unavailable" options={{ href: null }} />
      <Tabs.Screen name="availability" options={{ href: null }} />
      <Tabs.Screen name="request-time-off" options={{ href: null }} />
      <Tabs.Screen name="set-recurring-hours" options={{ href: null }} />
      <Tabs.Screen name="transfer-shift" options={{ href: null }} />
      <Tabs.Screen name="staff-id-card" options={{ href: null }} />
      <Tabs.Screen name="staff-reports" options={{ href: null }} />
      <Tabs.Screen name="shift-medications" options={{ href: null }} />
      <Tabs.Screen name="shift-transportations" options={{ href: null }} />
      <Tabs.Screen name="intake-form" options={{ href: null }} />
      <Tabs.Screen name="active-route" options={{ href: null }} />
      <Tabs.Screen name="vehicle-check" options={{ href: null }} />
      <Tabs.Screen name="shift-completion" options={{ href: null }} />
      <Tabs.Screen name="complete-shift" options={{ href: null }} />
      <Tabs.Screen name="transportation-detail" options={{ href: null }} />
      <Tabs.Screen name="transportation-shift-detail" options={{ href: null }} />
    </Tabs>
  );
}
