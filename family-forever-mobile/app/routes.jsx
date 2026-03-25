import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";

const GREEN = "#1f5f3b";
const LIGHT_GREEN = "#d1fae5";
const BG = "#f4f6f5";

export default function Routes() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = data.filter(
        (s) =>
          (s?.name?.toLowerCase() === user?.name?.toLowerCase() ||
            s?.userId === user?.userId) &&
          (s.serviceType === "Transportation" || s.serviceType === "Transportations")
      );
      setShifts(mine);
    });
    return () => unsub();
  }, [user]);

  const openMaps = (location) => {
    if (!location) return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ── */}
      <View style={{
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
      }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: GREEN, letterSpacing: 1.2, marginBottom: 4 }}>
          TRANSPORTATION
        </Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>
          My Routes
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Summary row */}
        {shifts.length > 0 && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            <View style={{
              flex: 1, backgroundColor: "#fff", borderRadius: 14,
              padding: 14, alignItems: "center",
              borderWidth: 1, borderColor: "#e5e7eb",
            }}>
              <Ionicons name="car-outline" size={22} color={GREEN} />
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 6 }}>
                {shifts.length}
              </Text>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "600", marginTop: 2 }}>
                Total Rides
              </Text>
            </View>
            <View style={{
              flex: 1, backgroundColor: "#fff", borderRadius: 14,
              padding: 14, alignItems: "center",
              borderWidth: 1, borderColor: "#e5e7eb",
            }}>
              <Ionicons name="speedometer-outline" size={22} color="#7c3aed" />
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 6 }}>
                72¢
              </Text>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "600", marginTop: 2 }}>
                CRA Rate
              </Text>
            </View>
            <View style={{
              flex: 1, backgroundColor: "#fff", borderRadius: 14,
              padding: 14, alignItems: "center",
              borderWidth: 1, borderColor: "#e5e7eb",
            }}>
              <Ionicons name="navigate-outline" size={22} color="#ea580c" />
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 6 }}>
                —
              </Text>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "600", marginTop: 2 }}>
                Total KM
              </Text>
            </View>
          </View>
        )}

        {shifts.length === 0 ? (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16,
            padding: 48, alignItems: "center",
            borderWidth: 1, borderColor: "#e5e7eb",
          }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: LIGHT_GREEN,
              alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <Ionicons name="car-outline" size={36} color={GREEN} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#374151" }}>
              No Routes Assigned
            </Text>
            <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
              Transportation shifts will appear here once assigned
            </Text>
          </View>
        ) : (
          shifts.map((shift, idx) => (
            <Pressable
              key={shift.id}
              onPress={() => setSelected(shift)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{
                  backgroundColor: "#fef3c7",
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#b45309" }}>
                    Route #{idx + 1}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="time-outline" size={13} color="#9ca3af" />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
                    {shift.startTime} – {shift.endTime}
                  </Text>
                </View>
              </View>

              {/* Client */}
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 }}>
                {shift.clientName || shift.name || "Client"}
              </Text>

              {/* Route visualization */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: LIGHT_GREEN,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="radio-button-on" size={14} color={GREEN} />
                  </View>
                  <Text style={{ fontSize: 13, color: "#374151", flex: 1 }} numberOfLines={1}>
                    {shift.pickupLocation || shift.location || "Pickup location"}
                  </Text>
                </View>

                <View style={{ marginLeft: 13, width: 2, height: 16, backgroundColor: "#e5e7eb" }} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: "#fee2e2",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="location" size={14} color="#dc2626" />
                  </View>
                  <Text style={{ fontSize: 13, color: "#374151", flex: 1 }} numberOfLines={1}>
                    {shift.dropLocation || shift.destination || "Drop-off location"}
                  </Text>
                </View>
              </View>

              {/* Bottom */}
              <View style={{
                marginTop: 14, paddingTop: 12,
                borderTopWidth: 1, borderTopColor: "#f3f4f6",
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              }}>
                <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>
                    {shift.startDate}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openMaps(shift.location)}
                  style={{
                    backgroundColor: GREEN, borderRadius: 8,
                    paddingVertical: 7, paddingHorizontal: 14,
                    flexDirection: "row", alignItems: "center", gap: 4,
                  }}
                >
                  <Ionicons name="navigate" size={13} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                    Navigate
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* ── ROUTE DETAIL MODAL ── */}
      {selected && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setSelected(null)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 36,
              maxHeight: "75%",
            }}>
              <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>
                      Route Details
                    </Text>
                    <Pressable
                      onPress={() => setSelected(null)}
                      style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Ionicons name="close" size={18} color="#374151" />
                    </Pressable>
                  </View>

                  {[
                    { icon: "person-outline", label: "Client", value: selected.clientName || selected.name },
                    { icon: "calendar-outline", label: "Date", value: selected.startDate },
                    { icon: "time-outline", label: "Time", value: `${selected.startTime} – ${selected.endTime}` },
                    { icon: "radio-button-on-outline", label: "Pickup", value: selected.pickupLocation || selected.location || "—" },
                    { icon: "location-outline", label: "Drop-off", value: selected.dropLocation || selected.destination || "—" },
                  ].map((row) => (
                    <View key={row.label} style={{
                      flexDirection: "row", alignItems: "flex-start",
                      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 12,
                    }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name={row.icon} size={17} color={GREEN} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 2 }}>
                          {row.label.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
                          {row.value || "—"}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <Pressable
                    onPress={() => openMaps(selected.location)}
                    style={{
                      backgroundColor: GREEN, borderRadius: 12,
                      paddingVertical: 15, alignItems: "center",
                      marginTop: 20, flexDirection: "row",
                      justifyContent: "center", gap: 8,
                    }}
                  >
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                      Open in Maps
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
