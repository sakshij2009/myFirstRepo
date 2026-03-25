import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";

export default function GeoCheckOut() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadShift();
    getLocation();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setShift(data);
        if (data.checkInTime) {
          const checkIn = new Date(data.checkInTime);
          const startElapsed = Math.floor((Date.now() - checkIn.getTime()) / 1000);
          setElapsed(startElapsed);
          timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
        }
      }
    } catch (e) {
      console.log("Error loading shift:", e);
    }
  };

  const getLocation = async () => {
    setLocationStatus("loading");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      setLocationStatus("obtained");
    } catch {
      setLocationStatus("error");
    }
  };

  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const handleCheckOut = async () => {
    if (locationStatus !== "obtained" && locationStatus !== "error") {
      Alert.alert("Location Required", "Waiting for location...");
      return;
    }
    setSubmitting(true);
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          checkedOut: true,
          checkOutTime: new Date().toISOString(),
          checkOutLocation: location ? { lat: location.latitude, lng: location.longitude } : null,
          status: "Completed",
        });
      }
      if (timerRef.current) clearInterval(timerRef.current);
      router.replace(`/shift-completion?shiftId=${shiftId}`);
    } catch (e) {
      Alert.alert("Error", "Failed to check out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>Check Out</Text>
        </View>

        <View style={{ padding: 20 }}>
          {/* Elapsed Time Card */}
          <View style={{ backgroundColor: GREEN, borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>TIME WORKED</Text>
            <Text style={{ color: "#fff", fontSize: 42, fontWeight: "800", letterSpacing: -1 }}>{formatElapsed(elapsed)}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ade80", marginRight: 6 }} />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>Shift in progress</Text>
            </View>
          </View>

          {/* Location Card */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 14 }}>Current Location</Text>
            <View style={{ height: 120, backgroundColor: "#f3f4f6", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              {locationStatus === "loading" ? (
                <ActivityIndicator color={GREEN} />
              ) : (
                <Ionicons name="location" size={40} color={locationStatus === "obtained" ? GREEN : "#9ca3af"} />
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: locationStatus === "obtained" ? "#22c55e" : "#f59e0b", marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: "#6b7280" }}>
                {locationStatus === "obtained" ? `Lat: ${location?.latitude?.toFixed(4)}, Lng: ${location?.longitude?.toFixed(4)}` :
                 locationStatus === "loading" ? "Getting location..." :
                 locationStatus === "denied" ? "Location permission denied" : "Location unavailable"}
              </Text>
            </View>
          </View>

          {/* Shift Summary */}
          {shift && (
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 14 }}>Shift Summary</Text>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="person-outline" size={16} color="#9ca3af" style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 14, color: "#374151" }}>{shift.clientName || shift.name || "Client"}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="time-outline" size={16} color="#9ca3af" style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 14, color: "#374151" }}>{shift.startTime} – {shift.endTime}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="location-outline" size={16} color="#9ca3af" style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 14, color: "#374151" }} numberOfLines={1}>{shift.location || "Location not specified"}</Text>
                </View>
                {shift.checkInTime && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="log-in-outline" size={16} color="#9ca3af" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 14, color: "#374151" }}>Checked in: {new Date(shift.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        <Pressable
          onPress={handleCheckOut}
          disabled={submitting}
          style={{ backgroundColor: submitting ? "#9ca3af" : "#ef4444", paddingVertical: 16, borderRadius: 14, alignItems: "center" }}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Complete & Check Out</Text>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
