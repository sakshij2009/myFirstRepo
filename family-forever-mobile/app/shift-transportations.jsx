import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config";
import ReportTransportationTab from "./_ReportTransportationTab";
import { formatShiftTimeUTCtoCanada } from "../src/utils/date";

const GREEN = "#1F6F43";

function isTransportShift(shift) {
  const raw = (
    shift?.categoryName ||
    shift?.shiftCategory ||
    shift?.serviceType ||
    shift?.category ||
    ""
  ).toLowerCase();
  return (
    raw.includes("transport") ||
    raw.includes("supervised visitation + transportation")
  );
}

export default function ShiftTransportations() {
  const { shiftId, section } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [intakeForm, setIntakeForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shiftId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "shifts", shiftId), (snap) => {
      if (snap.exists()) {
        setShift({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [shiftId]);

  useEffect(() => {
    if (!shift) return;
    const fetchIntakeForm = async () => {
      const clientName = shift.clientName || shift.clientDetails?.name || shift.clientDetails?.clientName;
      if (!clientName) return;
      try {
        const snapshot = await getDocs(collection(db, "InTakeForms"));
        let found = null;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (Array.isArray(data.inTakeClients)) {
            const match = data.inTakeClients.find(c =>
              c.name && c.name.trim().toLowerCase() === clientName.trim().toLowerCase()
            );
            if (match) found = match;
          }
        });
        setIntakeForm(found);
      } catch (err) {
        console.error("Error fetching intake form:", err);
      }
    };
    fetchIntakeForm();
  }, [shift?.clientName]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  if (shift && !isTransportShift(shift)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.push({ pathname: "/shift-detail", params: { shiftId } })} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>{section === "expense" ? "Expense" : "Transportation"}</Text>
        </View>
        <ReportTransportationTab shift={shift} shiftId={shiftId} section={section === "expense" ? "expense" : "transportation"} />
      </SafeAreaView>
    );
  }

  const primaryPoint = Array.isArray(shift?.shiftPoints) && shift.shiftPoints.length > 0
    ? shift.shiftPoints[0]
    : Array.isArray(shift?.clientDetails?.shiftPoints) && shift.clientDetails.shiftPoints.length > 0
      ? shift.clientDetails.shiftPoints[0]
      : {};

  const pickupAddress = primaryPoint?.pickupLocation || intakeForm?.pickupAddress || shift?.pickupLocation || "N/A";
  const visitAddress = primaryPoint?.visitLocation || intakeForm?.visitAddress || shift?.visitLocation || "N/A";
  const dropAddress = primaryPoint?.dropLocation || intakeForm?.dropOffAddress || shift?.dropLocation || "N/A";

  const rate = shift?.clientKMRate || shift?.clientRate || 5.5;
  const receipts = shift?.expenseReceiptUrlList || [];

  const visitDuration = shift?.visitDuration ||
    (shift?.visitStartOfficialTime && shift?.visitEndOfficialTime
      ? `${shift.visitStartOfficialTime} – ${shift.visitEndOfficialTime}`
      : null);

  const allPoints = Array.isArray(shift?.shiftPoints) && shift.shiftPoints.length > 0
    ? shift.shiftPoints
    : Array.isArray(shift?.clientDetails?.shiftPoints) && shift.clientDetails.shiftPoints.length > 0
      ? shift.clientDetails.shiftPoints
      : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.push({ pathname: "/shift-detail", params: { shiftId } })} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Transportation Details</Text>
        </View>

        <View style={{ padding: 20 }}>
          {/* Shift Banner */}
          {shift && (
            <View style={{ backgroundColor: "#fff7ed", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#fed7aa" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="car" size={20} color="#ea580c" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>
                    {shift.clientName || shift.clientDetails?.name || "Client"}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>
                    {formatShiftTimeUTCtoCanada(null, shift.startTime)} – {formatShiftTimeUTCtoCanada(null, shift.endTime)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Rate */}
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 4 }}>Transportation Rate</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>{rate}¢ per Kilometer</Text>
          </View>

          {/* Route Details */}
          {allPoints.length > 0 ? (
            allPoints.map((point, idx) => {
              const pickup = point.pickupLocation || intakeForm?.pickupAddress || "N/A";
              const visit = point.visitLocation || intakeForm?.visitAddress || "N/A";
              const drop = point.dropLocation || intakeForm?.dropOffAddress || "N/A";
              const passengerName = point.name || `Route ${idx + 1}`;

              return (
                <View key={idx} style={{ backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}>
                  <View style={{ backgroundColor: "#f0f9ff", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#0369a1" }}>
                      {allPoints.length > 1 ? `Route ${idx + 1} — ${passengerName}` : passengerName}
                    </Text>
                  </View>

                  <View style={{ padding: 16 }}>
                    {/* Starting Point */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN, marginTop: 4, marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>STARTING POINT</Text>
                        <Text style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{pickup}</Text>
                      </View>
                    </View>

                    <View style={{ width: 2, height: 16, backgroundColor: "#d1d5db", marginLeft: 4, marginBottom: 14 }} />

                    {/* Visit Destination */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#3b82f6", marginTop: 4, marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>VISIT DESTINATION</Text>
                        <Text style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{visit}</Text>
                        {visitDuration && (
                          <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                            Visit Duration: <Text style={{ fontWeight: "600" }}>{visitDuration}</Text>
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={{ width: 2, height: 16, backgroundColor: "#d1d5db", marginLeft: 4, marginBottom: 14 }} />

                    {/* Ending Point */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#ef4444", marginTop: 4, marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>ENDING POINT</Text>
                        <Text style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{drop}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Start Route Button */}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <Pressable
                      onPress={() => router.push(`/transportation-shift-detail?shiftId=${shiftId}&taskId=p-${idx}`)}
                      style={{ backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
                    >
                      <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Start Route</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN, marginTop: 4, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>STARTING POINT</Text>
                    <Text style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{pickupAddress}</Text>
                  </View>
                </View>

                <View style={{ width: 2, height: 16, backgroundColor: "#d1d5db", marginLeft: 4, marginBottom: 14 }} />

                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#3b82f6", marginTop: 4, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>VISIT DESTINATION</Text>
                    <Text style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{visitAddress}</Text>
                    {visitDuration && (
                      <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                        Visit Duration: <Text style={{ fontWeight: "600" }}>{visitDuration}</Text>
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ width: 2, height: 16, backgroundColor: "#d1d5db", marginLeft: 4, marginBottom: 14 }} />

                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#ef4444", marginTop: 4, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>ENDING POINT</Text>
                    <Text style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{dropAddress}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Receipts */}
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 10 }}>Receipts</Text>
            {receipts.length > 0 ? (
              receipts.map((url, i) => (
                <Pressable
                  key={i}
                  onPress={() => Linking.openURL(url)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: i < receipts.length - 1 ? 1 : 0, borderBottomColor: "#f3f4f6" }}
                >
                  <Ionicons name="receipt-outline" size={16} color={GREEN} style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 13, color: GREEN, fontWeight: "600", textDecorationLine: "underline" }}>
                    Receipt_{i + 1}.png
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>No receipts uploaded</Text>
            )}
          </View>

          {/* Cost Calculation */}
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 }}>Cost Calculation</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Distance:</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>0 Km</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Rate per Km:</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>${rate}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: "#e5e7eb", marginBottom: 12 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Total Cost:</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>$0.00</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
