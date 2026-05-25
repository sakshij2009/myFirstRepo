import { View, Text, Pressable, Alert, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";

const ROUTE_STEPS = ["Navigate to Pickup", "Arrived at Pickup", "Passenger Boarded", "En Route to Destination", "Arrived at Destination", "Passenger Dropped Off"];

export default function ActiveRoute() {
  const { shiftId, taskId, pickup, destination, passenger } = useLocalSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    startPulse();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startPulse = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = ((currentStep + 1) / ROUTE_STEPS.length) * 100;

  const advance = () => {
    if (currentStep < ROUTE_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeRoute();
    }
  };

  const completeRoute = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Alert.alert("Route Complete!", `${decodeURIComponent(passenger || "")} has been dropped off successfully.`, [
      { text: "Done", onPress: () => router.back() },
    ]);
  };

  const cancelRoute = () => {
    Alert.alert("Cancel Route?", "Are you sure you want to cancel this active route?", [
      { text: "Keep Going", style: "cancel" },
      { text: "Cancel Route", style: "destructive", onPress: () => { if (timerRef.current) clearInterval(timerRef.current); router.back(); } },
    ]);
  };

  const decodedPickup = decodeURIComponent(pickup || "Pickup location");
  const decodedDestination = decodeURIComponent(destination || "Destination");
  const decodedPassenger = decodeURIComponent(passenger || "Passenger");

  const stepColors = ["#3b82f6", "#f59e0b", "#8b5cf6", "#3b82f6", "#f59e0b", GREEN];
  const stepIcons = ["navigate", "location", "person-add", "car", "flag", "checkmark-circle"];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: 10, height: 10, borderRadius: 5, backgroundColor: "#4ade80", marginRight: 8 }} />
            <Text style={{ color: "#4ade80", fontSize: 13, fontWeight: "700" }}>IN PROGRESS</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 }}>{formatTime(elapsed)}</Text>
        </View>
        <Pressable onPress={cancelRoute} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 20, borderRadius: 2, marginBottom: 20 }}>
        <View style={{ height: 4, backgroundColor: "#4ade80", borderRadius: 2, width: `${progress}%` }} />
      </View>

      {/* Map Placeholder */}
      <View style={{ marginHorizontal: 20, borderRadius: 20, overflow: "hidden", marginBottom: 20, height: 200, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
        <Ionicons name="map" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>Map View</Text>
        <View style={{ position: "absolute", top: 14, left: 14, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="person" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{decodedPassenger}</Text>
        </View>
      </View>

      {/* Route Stops */}
      <View style={{ marginHorizontal: 20, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN, marginTop: 4, marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>PICKUP</Text>
            <Text style={{ fontSize: 14, color: "#fff", marginTop: 2 }}>{decodedPickup}</Text>
          </View>
        </View>
        <View style={{ width: 2, height: 20, backgroundColor: "rgba(255,255,255,0.15)", marginLeft: 4, marginBottom: 12 }} />
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#ef4444", marginTop: 4, marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>DESTINATION</Text>
            <Text style={{ fontSize: 14, color: "#fff", marginTop: 2 }}>{decodedDestination}</Text>
          </View>
        </View>
      </View>

      {/* Steps */}
      <View style={{ flex: 1, marginHorizontal: 20 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ROUTE_STEPS.map((step, i) => (
            <View key={step} style={{ flexDirection: "row", alignItems: "center", backgroundColor: i === currentStep ? "rgba(74,222,128,0.15)" : i < currentStep ? "rgba(255,255,255,0.05)" : "transparent", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: i === currentStep ? "#4ade80" : i < currentStep ? "rgba(255,255,255,0.1)" : "transparent" }}>
              {i < currentStep ? <Ionicons name="checkmark" size={12} color="#4ade80" style={{ marginRight: 4 }} /> : null}
              <Text style={{ fontSize: 11, color: i === currentStep ? "#4ade80" : i < currentStep ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)", fontWeight: i === currentStep ? "700" : "400" }}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Button */}
      <View style={{ padding: 20 }}>
        <Pressable
          onPress={advance}
          style={{ backgroundColor: currentStep === ROUTE_STEPS.length - 1 ? "#4ade80" : stepColors[currentStep], paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
        >
          <Ionicons name={stepIcons[currentStep]} size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
            {currentStep === ROUTE_STEPS.length - 1 ? "Complete Route" : ROUTE_STEPS[currentStep + 1] ? `Next: ${ROUTE_STEPS[currentStep + 1]}` : "Complete"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
