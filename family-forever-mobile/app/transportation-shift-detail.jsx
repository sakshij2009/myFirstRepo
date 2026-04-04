import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { safeString, parseDate, formatCanadaTime, formatShiftTimeUTCtoCanada } from "../src/utils/date";
import IntakeView from "./_IntakeView";

const PRIMARY_GREEN = "#1F6F43";
const GREEN = "#1F6F43";
const DARK = "#111827";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const PAGE_BG = "#F9FAFB";

// Format date: "Thu, 20 Mar · 2:00 – 6:00 PM"
function formatHeaderDate(shift) {
  if (!shift) return "";
  const d = parseDate(shift.startDate);
  let datePart = "";
  if (d) {
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    datePart = `${weekday}, ${day} ${month}`;
  }
  const timePart =
    shift.startTime && shift.endTime
      ? `${formatShiftTimeUTCtoCanada(shift.startDate, shift.startTime)} – ${formatShiftTimeUTCtoCanada(shift.startDate, shift.endTime)}`
      : "";
  return [datePart, timePart].filter(Boolean).join(" · ");
}

// Open address in Google Maps
function openMaps(address) {
  if (!address) return;
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  ).catch(() => Alert.alert("Error", "Could not open maps."));
}

// Format initials from name
function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TransportationShiftDetail() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntake, setShowIntake] = useState(false);

  // Real-time shift listener
  useEffect(() => {
    if (!shiftId) return;
    const unsub = onSnapshot(doc(db, "shifts", shiftId), (snap) => {
      if (snap.exists()) setShift({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [shiftId]);

  // Fetch intake data for shift description fallback
  useEffect(() => {
    if (!shift) return;
    const fetchIntake = async () => {
      try {
        const clientId = shift.clientId || shift.clientDetails?.id;
        const intakeId = shift.intakeId;
        const clientName = shift.clientName || shift.name || shift.clientDetails?.name || shift.client;

        let matched = null;

        // 1. Direct ID Resolve
        if (intakeId) {
          const snap = await getDoc(doc(db, "InTakeForms", String(intakeId)));
          if (snap.exists()) matched = { ...snap.data(), id: snap.id };
        }

        // 2. Comprehensive search across InTakeForms and clients
        if (!matched) {
          const collections = ["InTakeForms", "clients"];
          const cleanName = clientName ? clientName.toString().trim().toLowerCase() : null;

          for (const collName of collections) {
            if (matched) break;
            const snapshot = await getDocs(collection(db, collName));
            
            snapshot.docs.some((docSnap) => {
              const data = docSnap.data();
              const docId = docSnap.id;

              // ID Match
              // Check various ID fields: clientId, formId, id, InTakeFormId, etc.
              const possibleIds = new Set([docId, data.clientId, data.formId, data.id, data.InTakeFormId, data.intakeId].filter(Boolean).map(id => String(id)));
              const targetIds = [clientId, intakeId].filter(Boolean).map(id => String(id));

              if (targetIds.some(tid => possibleIds.has(tid))) {
                matched = { ...data, id: docId };
                return true;
              }

              // Name Match
              if (cleanName) {
                const possibleNames = new Set();
                [data.clientName, data.name, data.nameInClientTable, data.familyName, data.nameOfPerson, data.childName]
                  .forEach(n => n && possibleNames.add(n.toString().toLowerCase().trim()));

                if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
                  Object.values(data.clients).forEach(c => {
                    if (c.fullName) possibleNames.add(c.fullName.toLowerCase().trim());
                    if (c.name) possibleNames.add(c.name.toLowerCase().trim());
                  });
                }
                if (Array.isArray(data.inTakeClients)) {
                  data.inTakeClients.forEach(c => {
                    if (c.name) possibleNames.add(c.name.toLowerCase().trim());
                  });
                }

                if (Array.from(possibleNames).some(fn => fn && (fn.includes(cleanName) || cleanName.includes(fn)))) {
                  matched = { ...data, id: docId };
                  return true;
                }
              }
              return false;
            });
          }
        }

        if (matched) setIntake(matched);
      } catch (e) {
        console.error("Auto intake fetch error:", e);
      }
    };
    fetchIntake();
  }, [shift?.id]);

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: PAGE_BG, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  const pt = Array.isArray(shift?.shiftPoints) && shift.shiftPoints[0];
  
  const rawName = safeString(shift?.familyName || shift?.childName || shift?.clientName || shift?.name || shift?.client || shift?.clientDetails?.name);
  const intakeName = (() => {
    if (!intake) return "";
    if (intake.clients && typeof intake.clients === "object" && !Array.isArray(intake.clients)) {
      const names = Object.values(intake.clients).map(c => c.fullName || c.name || "").filter(Boolean);
      if (names.length) return names.join(", ");
    }
    const arraySource = intake.inTakeClients || intake.shiftPoints;
    if (Array.isArray(arraySource)) {
      const names = arraySource.map(c => c.name || c.fullName || "").filter(Boolean);
      if (names.length) return names.join(", ");
    }
    return safeString(intake.clientName || intake.name || intake.familyName || intake.nameInClientTable || intake.childName);
  })();

  const isId = (val) => val && /^\d+$/.test(String(val)) && String(val).length > 8;
  const clientName = isId(rawName) 
    ? (intakeName || shift?.familyName || shift?.childName || "Client") 
    : (rawName || intakeName || "Client");
  const clientId = safeString(shift?.clientId || intake?.clientId || intake?.formId) || "\u2014";

  const rawServiceType =
    safeString(shift?.category || shift?.categoryName || shift?.serviceType) ||
    "Transportation";
  const seatType = safeString(pt?.seatType || shift?.seatType);
  const shiftDescription = safeString(shift?.description || shift?.notes);

  // Contacts
  const caseworkerName =
    safeString(shift?.caseworkerName || intake?.caseworkerName);
  const caseworkerPhone =
    safeString(shift?.caseworkerPhone || intake?.caseworkerPhone);
  const intakeWorkerName = safeString(
    shift?.intakeWorkerName || intake?.intakeWorkerName
  );
  const intakeWorkerPhone = safeString(
    shift?.intakeWorkerPhone || intake?.intakeWorkerPhone
  );
  const weekendPhone1 = safeString(
    shift?.weekendPhone || intake?.weekendPhone || intake?.emergencyPhone1
  );
  const weekendPhone2 = safeString(
    shift?.weekendPhone2 || intake?.emergencyPhone2
  );

  // Route stops
  const stops = [
    {
      label: "Pickup",
      address: safeString(pt?.pickupLocation || shift?.pickupLocation),
      time: safeString(pt?.pickupTime || shift?.startTime),
      color: GREEN,
    },
    pt?.visitLocation || shift?.visitLocation
      ? {
          label: "Visit Location",
          address: safeString(pt?.visitLocation || shift?.visitLocation),
          time: safeString(pt?.visitTime || ""),
          color: "#1E5FA6",
        }
      : null,
    {
      label: "Drop-off",
      address: safeString(pt?.dropLocation || shift?.dropLocation),
      time: safeString(pt?.dropTime || shift?.endTime),
      color: "#DC2626",
    },
  ].filter(Boolean);

  const hasContacts =
    caseworkerName || caseworkerPhone || intakeWorkerName || weekendPhone1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAGE_BG }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={DARK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: DARK, fontFamily: "Poppins-SemiBold" }}
          >
            Transportation Shift
          </Text>
          <Text
            style={{ fontSize: 12, color: GRAY, marginTop: 1, fontFamily: "Inter" }}
          >
            {formatHeaderDate(shift)}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 14 }}
      >
        {/* ── Client Card ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: GRAY, fontWeight: "600", fontFamily: "Inter-SemiBold", marginBottom: 2 }}>CLIENT</Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: DARK,
                  fontFamily: "Poppins-Bold",
                  marginBottom: 4,
                }}
              >
                {clientName}
              </Text>
              <Text style={{ fontSize: 13, color: GRAY, fontFamily: "Inter-Medium", marginBottom: 8 }}>ID: {clientId}</Text>
              
              {seatType ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    alignSelf: "flex-start",
                    backgroundColor: "#F3F4F6",
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                  }}
                >
                  <Ionicons name="car-sport-outline" size={14} color={GRAY} />
                  <Text
                    style={{ fontSize: 13, color: DARK, fontWeight: "600", fontFamily: "Inter-SemiBold" }}
                  >
                    {seatType}
                  </Text>
                </View>
              ) : null}
            </View>
            <View
              style={{
                backgroundColor: "#FEF9C3",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: "#854D0E", fontFamily: "Inter-Bold" }}
              >
                {rawServiceType}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Shift Description ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="information-circle-outline" size={18} color={GREEN} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: DARK, fontFamily: "Poppins-SemiBold" }}>Shift Description</Text>
            </View>
            {intake && (
              <Pressable onPress={() => setShowIntake(true)}>
                <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 13 }}>View Intake Form</Text>
              </Pressable>
            )}
          </View>
          <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, fontFamily: "Inter", marginTop: 4 }}>
            {shiftDescription || "No specific description provided for this shift."}
          </Text>
        </View>

        {/* ── Contacts Card ───────────────────────────────────────────────── */}
        {hasContacts && (
          <View style={styles.card}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: DARK,
                fontFamily: "Poppins-SemiBold",
                marginBottom: 14,
              }}
            >
              Contacts
            </Text>

            {/* Caseworker */}
            {caseworkerName ? (
              <ContactRow
                initials_text={initials(caseworkerName)}
                name={caseworkerName}
                role="Caseworker"
                phone={caseworkerPhone}
                avatarBg="#E0F2FE"
                avatarText="#0369A1"
              />
            ) : null}

            {/* Intake Worker */}
            {intakeWorkerName ? (
              <ContactRow
                initials_text={initials(intakeWorkerName)}
                name={intakeWorkerName}
                role="Intake Worker"
                phone={intakeWorkerPhone}
                avatarBg="#EDE9FE"
                avatarText="#5B21B6"
              />
            ) : null}

            {/* Weekend & After-Hours */}
            {weekendPhone1 ? (
              <View
                style={{
                  backgroundColor: "#FFFBEB",
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color="#D97706"
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#D97706",
                      fontFamily: "Inter-Bold",
                    }}
                  >
                    Weekend & After-Hours
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Pressable onPress={() => Linking.openURL(`tel:${weekendPhone1}`)}>
                    <Text
                      style={{ fontSize: 13, fontWeight: "700", color: "#D97706", fontFamily: "Inter-Bold" }}
                    >
                      {weekendPhone1}
                    </Text>
                  </Pressable>
                  {weekendPhone2 ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${weekendPhone2}`)}>
                      <Text
                        style={{ fontSize: 13, fontWeight: "700", color: "#D97706", fontFamily: "Inter-Bold", marginTop: 2 }}
                      >
                        {weekendPhone2}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Disclaimer */}
            <View
              style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 10, gap: 6 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={GRAY}
                style={{ marginTop: 1 }}
              />
              <Text
                style={{ fontSize: 12, color: GRAY, flex: 1, lineHeight: 17, fontFamily: "Inter" }}
              >
                Caseworker &amp; Intake Worker are unavailable on weekends. Use
                the emergency line above.
              </Text>
            </View>
          </View>
        )}

        {/* ── Route Card ──────────────────────────────────────────────────── */}
        {stops.length > 0 && (
          <View style={styles.card}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: DARK,
                fontFamily: "Poppins-SemiBold",
                marginBottom: 16,
              }}
            >
              Route
            </Text>

            {stops.map((stop, idx) => (
              <View key={idx}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  {/* Timeline dot + line */}
                  <View style={{ alignItems: "center", width: 20, marginRight: 14 }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: stop.color,
                        marginTop: 4,
                      }}
                    />
                    {idx < stops.length - 1 && (
                      <View
                        style={{
                          width: 2,
                          flex: 1,
                          backgroundColor: "#E5E7EB",
                          marginTop: 4,
                          minHeight: 48,
                        }}
                      />
                    )}
                  </View>

                  {/* Stop info */}
                  <View style={{ flex: 1, paddingBottom: idx < stops.length - 1 ? 16 : 0 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: DARK,
                        fontFamily: "Inter-Bold",
                        marginBottom: 2,
                      }}
                    >
                      {stop.label}
                    </Text>
                    {stop.address ? (
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#374151",
                          fontFamily: "Inter",
                          marginBottom: 2,
                        }}
                      >
                        {stop.address}
                      </Text>
                    ) : null}
                    {stop.time ? (
                      <Text
                        style={{ fontSize: 12, color: GRAY, fontFamily: "Inter", marginBottom: 6 }}
                      >
                        {stop.time}
                      </Text>
                    ) : null}
                    {stop.address ? (
                      <Pressable
                        onPress={() => openMaps(stop.address)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          backgroundColor: "#F0FDF4",
                          borderRadius: 20,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          alignSelf: "flex-start",
                        }}
                      >
                        <Ionicons name="location-outline" size={13} color={GREEN} />
                        <Text
                          style={{ fontSize: 12, fontWeight: "600", color: GREEN, fontFamily: "Inter-SemiBold" }}
                        >
                          View on Maps
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom: Choose Vehicle ─────────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: BORDER,
          padding: 20,
        }}
      >
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/vehicle-check",
              params: { shiftId: shiftId },
            })
          }
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#185A37" : GREEN,
            borderRadius: 14,
            paddingVertical: 17,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "700",
              fontFamily: "Poppins-SemiBold",
            }}
          >
            Choose Vehicle
          </Text>
        </Pressable>
      </View>

      <Modal visible={showIntake} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowIntake(false)}>
        <View style={{ flex: 1, backgroundColor: "#FFF" }}>
          {/* Modal Header */}
          <View style={{ 
            flexDirection: "row", 
            alignItems: "center", 
            paddingHorizontal: 20, 
            paddingTop: 60, 
            paddingBottom: 15,
            borderBottomWidth: 1, 
            borderBottomColor: "#E5E7EB"
          }}>
            <Pressable onPress={() => setShowIntake(false)} style={{ padding: 5 }}>
              <Ionicons name="close" size={28} color="#000" />
            </Pressable>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: "800", 
              marginLeft: 15, 
              fontFamily: "Poppins-Bold",
              color: "#111827" 
            }}>Client Intake Form</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <IntakeView intakeData={intake} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ContactRow({ initials_text, name, role, phone, avatarBg, avatarText }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: avatarBg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: avatarText, fontFamily: "Inter-Bold" }}>
          {initials_text}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter-SemiBold" }}>
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: GRAY, fontFamily: "Inter" }}>{role}</Text>
      </View>
      {phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${phone}`)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#F0FDF4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="call-outline" size={18} color={GREEN} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = {
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
};
