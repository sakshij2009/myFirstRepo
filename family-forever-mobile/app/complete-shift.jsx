/**
 * Complete Shift — Active Transportation Route Execution Screen
 *
 * Flow:
 *   Pickup A → Pickup B → ... → Visit → Drop A → Drop B → Done
 *
 * Each stop has:
 *   - Map placeholder + Open Full Navigation
 *   - Client confirmation rows (Confirm / Cancel)
 *   - Context-sensitive bottom CTA
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import * as Location from "expo-location";
import { db } from "../src/firebase/config";
import { safeString, parseDate } from "../src/utils/date";

// ── Office address (for personal vehicle KM) ─────────────────────────────────
const OFFICE_ADDRESS = "#206, 10110 124 Street, Edmonton, AB T5N 1P6";

// ── GPS distance helper ───────────────────────────────────────────────────────
function haversineKm(c1, c2) {
  const R = 6371;
  const dLat = (c2.latitude - c1.latitude) * (Math.PI / 180);
  const dLon = (c2.longitude - c1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(c1.latitude * (Math.PI / 180)) *
      Math.cos(c2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtMinutes(mins) {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Tokens ────────────────────────────────────────────────────────────────────
const GREEN = "#1F6F43";
const GREEN_LIGHT = "#F0FDF4";
const BLUE = "#1E5FA6";
const BLUE_LIGHT = "#EFF6FF";
const DARK = "#111827";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const PAGE = "#F9FAFB";
const RED = "#DC2626";

// ── Demo data (used when Firebase shiftPoints is empty / single-client) ───────
const DEMO_CLIENTS = [
  { id: "c1", name: "Michael Chen",   seatType: "Car Seat", pickupAddr: "1234 Oak Street, Suite 5",  pickupTime: "2:00 PM",  dropAddr: "789 Maple Avenue, Apt 3",  dropTime: "6:00 PM" },
  { id: "c2", name: "Adriana Torres", seatType: "Booster",  pickupAddr: "1234 Oak Street, Suite 5",  pickupTime: "2:00 PM",  dropAddr: "789 Maple Avenue, Apt 3",  dropTime: "6:00 PM" },
  { id: "c3", name: "Liam Kim",       seatType: null,        pickupAddr: "456 Elm Drive, Unit 2",      pickupTime: "2:20 PM",  dropAddr: "1200 Pine Street",          dropTime: "6:30 PM" },
];
const DEMO_VISIT_ADDR = "500 City Hall Plaza";
const DEMO_VISIT_TIME = "3:00 PM";

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function letterLabel(i) {
  return String.fromCharCode(65 + i); // A, B, C …
}

function openMaps(address) {
  if (!address) return;
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  ).catch(() => Alert.alert("Error", "Could not open maps."));
}

function formatHeaderDate(shift) {
  if (!shift) return "";
  const d = parseDate(shift.startDate);
  let part = "";
  if (d) {
    part = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  }
  const t = shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : "";
  return [part, t].filter(Boolean).join(" · ");
}

/**
 * Build the stops array from the shift's shiftPoints (or demo data).
 * Returns: [ { type, label, address, time, clients: [{id,name,seatType}] } ]
 */
function buildStops(shiftPoints, shift) {
  let clients = [];

  if (Array.isArray(shiftPoints) && shiftPoints.length > 0) {
    // Multi-client from shiftPoints
    shiftPoints.forEach((sp, i) => {
      if (sp.pickupLocation) {
        clients.push({
          id: sp.clientId || `sp_${i}`,
          name: sp.clientName || safeString(shift?.clientName) || `Client ${i + 1}`,
          seatType: sp.seatType || null,
          pickupAddr: sp.pickupLocation,
          pickupTime: sp.pickupTime || safeString(shift?.startTime) || "",
          dropAddr: sp.dropLocation || "",
          dropTime: sp.dropTime || safeString(shift?.endTime) || "",
          visitAddr: sp.visitLocation || "",
          visitTime: sp.visitTime || "",
        });
      }
    });
  }

  // Fallback: single-client shift
  if (clients.length === 0 && shift) {
    const pt = Array.isArray(shift.shiftPoints) && shift.shiftPoints[0];
    const pickupAddr = safeString(pt?.pickupLocation || shift.pickupLocation);
    const dropAddr   = safeString(pt?.dropLocation   || shift.dropLocation);
    if (pickupAddr) {
      clients.push({
        id: shift.clientId || "c0",
        name: safeString(shift.clientName || shift.name) || "Client",
        seatType: pt?.seatType || null,
        pickupAddr,
        pickupTime: safeString(pt?.pickupTime || shift.startTime) || "",
        dropAddr,
        dropTime: safeString(pt?.dropTime || shift.endTime) || "",
        visitAddr: safeString(pt?.visitLocation || shift.visitLocation) || "",
        visitTime: safeString(pt?.visitTime) || "",
      });
    }
  }

  // Last fallback: demo
  if (clients.length === 0) clients = DEMO_CLIENTS;

  const stops = [];
  const pickupGroups = {};
  const dropGroups   = {};

  clients.forEach((c) => {
    const pk = c.pickupAddr || "Unknown";
    if (!pickupGroups[pk]) pickupGroups[pk] = { address: pk, time: c.pickupTime, clients: [] };
    pickupGroups[pk].clients.push(c);

    const dk = c.dropAddr || "Unknown";
    if (!dropGroups[dk]) dropGroups[dk] = { address: dk, time: c.dropTime, clients: [] };
    dropGroups[dk].clients.push(c);
  });

  // Pickup stops
  Object.values(pickupGroups).forEach((g, i) => {
    stops.push({ type: "pickup", label: `Pickup ${letterLabel(i)}`, address: g.address, time: g.time, clients: g.clients });
  });

  // Visit stop (use first client's visitAddr or demo)
  const visitAddr = clients[0]?.visitAddr || DEMO_VISIT_ADDR;
  const visitTime = clients[0]?.visitTime || DEMO_VISIT_TIME;
  if (visitAddr) {
    stops.push({ type: "visit", label: "Visit", address: visitAddr, time: visitTime, clients });
  }

  // Drop stops
  Object.values(dropGroups).forEach((g, i) => {
    stops.push({ type: "drop", label: `Drop ${letterLabel(i)}`, address: g.address, time: g.time, clients: g.clients });
  });

  return stops;
}

// ── Map Placeholder ───────────────────────────────────────────────────────────
function MapPlaceholder({ address, color = GREEN }) {
  return (
    <View style={[mapStyles.container, { borderColor: color + "30" }]}>
      {/* Grid lines */}
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={`h${i}`} style={[mapStyles.hLine, { top: `${(i + 1) * 13}%` }]} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={`v${i}`} style={[mapStyles.vLine, { left: `${(i + 1) * 10}%` }]} />
      ))}
      {/* Pin */}
      <View style={mapStyles.pinWrap}>
        <Ionicons name="location" size={32} color={color} />
        {address ? (
          <Text style={[mapStyles.pinLabel, { color }]} numberOfLines={1}>
            {address.split(",")[0]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    height: 150,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    position: "relative",
  },
  hLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#C8E6C9" },
  vLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "#C8E6C9" },
  pinWrap: { alignItems: "center", zIndex: 1 },
  pinLabel: { fontSize: 12, fontWeight: "700", marginTop: 2, fontFamily: "Inter-Bold" },
});

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ stops, currentIdx, completedStops }) {
  return (
    <View style={pbStyles.row}>
      {stops.map((stop, i) => {
        const isCompleted = completedStops.includes(i);
        const isCurrent   = i === currentIdx;
        const circleColor = isCompleted || isCurrent ? GREEN : "#D1D5DB";
        const lineColor   = isCompleted ? GREEN : "#E5E7EB";
        return (
          <View key={i} style={pbStyles.stepWrap}>
            {i > 0 && (
              <View style={[pbStyles.line, { backgroundColor: lineColor }]} />
            )}
            <View style={pbStyles.dotCol}>
              <View style={[pbStyles.circle, { backgroundColor: isCompleted ? GREEN : isCurrent ? "#fff" : "#F3F4F6", borderColor: circleColor, borderWidth: isCurrent ? 2 : 0 }]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : (
                  <Text style={[pbStyles.circleNum, { color: isCurrent ? GREEN : "#9CA3AF" }]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={[pbStyles.label, { color: isCurrent ? GREEN : isCompleted ? GREEN : "#9CA3AF", fontWeight: isCurrent ? "700" : "500" }]} numberOfLines={1}>
                {stop.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDER },
  stepWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  line: { flex: 1, height: 2, marginTop: -12 },
  dotCol: { alignItems: "center", gap: 4 },
  circle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  circleNum: { fontSize: 10, fontWeight: "700" },
  label: { fontSize: 9, textAlign: "center", maxWidth: 48, fontFamily: "Inter" },
});

// ── Client Row ────────────────────────────────────────────────────────────────
function ClientStatusRow({ client, status, onConfirm, onCancel, actionLabel, confirmedLabel }) {
  const isConfirmed  = status === "confirmed";
  const isCancelled  = status === "cancelled";
  const avatarColors = [
    { bg: "#E0F2FE", text: "#0369A1" },
    { bg: "#EDE9FE", text: "#5B21B6" },
    { bg: "#FEF3C7", text: "#92400E" },
    { bg: "#FCE7F3", text: "#9D174D" },
  ];
  const ac = avatarColors[(client.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <View style={[crStyles.row, isConfirmed && crStyles.rowConfirmed, isCancelled && crStyles.rowCancelled]}>
      {/* Avatar */}
      <View style={[crStyles.avatar, { backgroundColor: ac.bg }]}>
        <Text style={[crStyles.avatarText, { color: ac.text }]}>{initials(client.name)}</Text>
      </View>
      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={[crStyles.name, isCancelled && { textDecorationLine: "line-through", color: GRAY }]}>{client.name}</Text>
        {client.seatType ? (
          <Text style={crStyles.seat}>{client.seatType}</Text>
        ) : null}
      </View>
      {/* Action */}
      {isConfirmed ? (
        <View style={crStyles.confirmedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={GREEN} />
          <Text style={crStyles.confirmedText}>{confirmedLabel}</Text>
        </View>
      ) : isCancelled ? (
        <View style={crStyles.cancelledBadge}>
          <Ionicons name="close-circle" size={14} color={RED} />
          <Text style={crStyles.cancelledText}>Not available</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Pressable onPress={onConfirm} style={crStyles.confirmBtn}>
            <Text style={crStyles.confirmBtnText}>{actionLabel}</Text>
          </Pressable>
          <Pressable onPress={onCancel} style={crStyles.cancelBtn}>
            <Ionicons name="close" size={16} color={GRAY} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const crStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 8, backgroundColor: "#fff" },
  rowConfirmed: { backgroundColor: GREEN_LIGHT, borderColor: "#86EFAC" },
  rowCancelled: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", opacity: 0.7 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter-Bold" },
  name: { fontSize: 14, fontWeight: "600", color: DARK, fontFamily: "Inter-SemiBold" },
  seat: { fontSize: 12, color: GRAY, fontFamily: "Inter" },
  confirmedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  confirmedText: { fontSize: 12, color: GREEN, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  cancelledBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  cancelledText: { fontSize: 12, color: RED, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  confirmBtn: { backgroundColor: GREEN_LIGHT, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#86EFAC" },
  confirmBtnText: { fontSize: 12, fontWeight: "700", color: GREEN, fontFamily: "Inter-Bold" },
  cancelBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
});

// ── Completed Stop Row ────────────────────────────────────────────────────────
function CompletedStop({ stop }) {
  const clientNames = stop.clients.map((c) => c.name).join(", ");
  return (
    <View style={csStyles.row}>
      <View style={csStyles.iconWrap}>
        <Ionicons name="checkmark-circle" size={20} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={csStyles.label}>{stop.label} — {stop.address?.split(",")[0]}</Text>
        <Text style={csStyles.clients} numberOfLines={1}>{clientNames}</Text>
      </View>
    </View>
  );
}

const csStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: GREEN_LIGHT, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#BBF7D0", borderLeftWidth: 4, borderLeftColor: GREEN },
  iconWrap: { marginRight: 10 },
  label: { fontSize: 13, fontWeight: "700", color: DARK, fontFamily: "Inter-Bold" },
  clients: { fontSize: 12, color: GRAY, marginTop: 1, fontFamily: "Inter" },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CompleteShift() {
  const { shiftId, vehicleType } = useLocalSearchParams();

  const [shift, setShift]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [stops, setStops]       = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedIdxs, setCompletedIdxs] = useState([]);
  // stopClientStatus: { stopIndex_clientId → 'waiting'|'confirmed'|'cancelled' }
  const [clientStatus, setClientStatus] = useState({});
  const [visitArrived, setVisitArrived]  = useState(false);
  const [visitNotes, setVisitNotes]      = useState("");
  const [totalKm, setTotalKm]   = useState(0);
  const locationSubRef = useRef(null);
  const lastCoordsRef  = useRef(null);
  const startTimeRef   = useRef(Date.now());
  const kmRef          = useRef(null); // fallback simulation

  // GPS distance tracking
  useEffect(() => {
    let active = true;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (status === "granted") {
        locationSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 15 },
          (pos) => {
            if (!active) return;
            if (lastCoordsRef.current) {
              const d = haversineKm(lastCoordsRef.current, pos.coords);
              if (d < 0.5) { // ignore GPS jumps > 500m
                setTotalKm((k) => Math.round((k + d) * 100) / 100);
              }
            }
            lastCoordsRef.current = pos.coords;
          }
        );
      } else {
        // Fallback simulation when location denied
        kmRef.current = setInterval(() => {
          setTotalKm((k) => Math.round((k + 0.04) * 100) / 100);
        }, 4000);
      }
    };
    startTracking();
    return () => {
      active = false;
      locationSubRef.current?.remove();
      clearInterval(kmRef.current);
    };
  }, []);

  // Load shift
  useEffect(() => {
    if (!shiftId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "shifts", shiftId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setShift(data);
        const builtStops = buildStops(data.shiftPoints, data);
        setStops(builtStops);
        // Init client statuses
        const init = {};
        builtStops.forEach((st, si) => {
          st.clients.forEach((c) => { init[`${si}_${c.id}`] = "waiting"; });
        });
        setClientStatus(init);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [shiftId]);

  const setStatus = useCallback((stopIdx, clientId, status) => {
    setClientStatus((prev) => ({ ...prev, [`${stopIdx}_${clientId}`]: status }));
  }, []);

  const currentStop = stops[currentIdx];
  const isPickup = currentStop?.type === "pickup";
  const isDrop   = currentStop?.type === "drop";
  const isVisit  = currentStop?.type === "visit";

  // Check if all clients in current stop are resolved (confirmed or cancelled)
  const allResolved = currentStop?.clients.every(
    (c) => clientStatus[`${currentIdx}_${c.id}`] !== "waiting"
  );

  const allConfirmed = currentStop?.clients.every(
    (c) => clientStatus[`${currentIdx}_${c.id}`] === "confirmed"
  );

  // Global client status (for the top roster card)
  // A client is "In vehicle" if they're confirmed at their pickup; "Waiting" otherwise
  const getGlobalStatus = (client) => {
    // Check if confirmed at any pickup
    let pickedUp = false;
    stops.forEach((st, si) => {
      if (st.type === "pickup" && st.clients.find((c) => c.id === client.id)) {
        if (clientStatus[`${si}_${client.id}`] === "confirmed") pickedUp = true;
      }
    });
    return pickedUp ? "In vehicle" : "Waiting";
  };

  // All unique clients across all stops
  const allClients = stops.length > 0
    ? [...new Map(stops.flatMap((s) => s.clients).map((c) => [c.id, c])).values()]
    : [];

  const advanceStop = async () => {
    if (currentIdx >= stops.length - 1) {
      // All stops done — stop tracking
      locationSubRef.current?.remove();
      clearInterval(kmRef.current);
      const totalTimeMinutes = Math.round((Date.now() - startTimeRef.current) / 60000);
      const isPersonalVehicle = vehicleType === "personal";
      const firstPickup = stops.find((s) => s.type === "pickup")?.address || "";
      const lastDrop = [...stops].reverse().find((s) => s.type === "drop")?.address || "";

      if (shiftId) {
        try {
          await updateDoc(doc(db, "shifts", shiftId), {
            transportationCompleted: true,
            transportationKm: totalKm,
            transportationCompletedAt: serverTimestamp(),
            visitNotes: visitNotes.trim() || null,
            totalTimeMinutes,
            vehicleType: vehicleType || null,
            ...(isPersonalVehicle && {
              personalVehicleFirstPickup: firstPickup,
              personalVehicleLastDrop: lastDrop,
              personalVehicleOfficeAddress: OFFICE_ADDRESS,
            }),
          });
        } catch (e) { console.warn("advanceStop save error:", e); }
      }
      // Navigate to shift report
      router.replace({ pathname: "/shift-completion", params: { shiftId } });
      return;
    }
    setCompletedIdxs((prev) => [...prev, currentIdx]);
    setCurrentIdx((prev) => prev + 1);
    setVisitArrived(false);
  };

  // CTA config
  const getCtaConfig = () => {
    if (isPickup || isDrop) {
      const label = isPickup ? "Confirm Pickup" : "Confirm Drop-off";
      if (!allResolved) return { text: "Confirm all clients to continue", disabled: true, color: "#A7C4B5" };
      const isLast  = currentIdx === stops.length - 1;
      const nextStop = stops[currentIdx + 1];
      let text = "Next →";
      if (nextStop?.type === "pickup") text = `Next ${nextStop.label} →`;
      else if (nextStop?.type === "visit") text = "Drive to Visit →";
      else if (nextStop?.type === "drop") text = `Drive to ${nextStop.label} →`;
      if (isLast) text = "Complete Shift ✓";
      return { text, disabled: false, color: GREEN };
    }
    if (isVisit) {
      if (!visitArrived) return { text: "Arrive at visit to continue", disabled: true, color: "#A7C4B5" };
      return { text: "Visit Complete — Ready to Leave →", disabled: false, color: BLUE };
    }
    return { text: "Continue", disabled: false, color: GREEN };
  };

  const ctaConfig = getCtaConfig();

  const confirmLabel = isPickup ? "Picked up" : "Dropped off";
  const actionLabel  = isPickup ? "Confirm Pickup" : "Confirm Drop-off";

  // Stop type color
  const stopColor = isPickup ? GREEN : isVisit ? BLUE : RED;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAGE, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAGE }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={DARK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Complete Shift</Text>
          <Text style={s.headerSub}>{formatHeaderDate(shift)}</Text>
        </View>
        <View style={s.kmBadge}>
          <Text style={s.kmText}>{totalKm.toFixed(1)} km</Text>
        </View>
      </View>

      {/* ── Progress Bar ───────────────────────────────────────────────────── */}
      {stops.length > 0 && (
        <ProgressBar stops={stops} currentIdx={currentIdx} completedStops={completedIdxs} />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>

        {/* ── Clients on this route ─────────────────────────────────────────── */}
        {allClients.length > 0 && (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="people-outline" size={18} color={GREEN} />
                <Text style={s.cardTitle}>Clients on this route</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN, fontFamily: "Inter-Bold" }}>
                {allClients.length} client{allClients.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {allClients.map((c) => {
              const gs = getGlobalStatus(c);
              return (
                <View key={c.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <View style={[s.miniAvatar, { backgroundColor: gs === "In vehicle" ? GREEN_LIGHT : "#F3F4F6" }]}>
                    <Text style={[s.miniAvatarText, { color: gs === "In vehicle" ? GREEN : GRAY }]}>{initials(c.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: DARK, fontFamily: "Inter-SemiBold" }}>{c.name}</Text>
                    {c.seatType ? <Text style={{ fontSize: 12, color: GRAY, fontFamily: "Inter" }}>{c.seatType}</Text> : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={[s.statusDot, { backgroundColor: gs === "In vehicle" ? GREEN : "#D1D5DB" }]} />
                    <Text style={{ fontSize: 12, color: gs === "In vehicle" ? GREEN : GRAY, fontWeight: "600", fontFamily: "Inter-SemiBold" }}>{gs}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Completed stops (collapsed) ──────────────────────────────────── */}
        {completedIdxs.map((si) => (
          <CompletedStop key={si} stop={stops[si]} />
        ))}

        {/* ── Current Stop ─────────────────────────────────────────────────── */}
        {currentStop && (
          <View style={s.card}>
            {/* Stop header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[s.stopIcon, { backgroundColor: stopColor + "18" }]}>
                  <Ionicons
                    name={isPickup ? "car-outline" : isVisit ? "business-outline" : "flag-outline"}
                    size={18}
                    color={stopColor}
                  />
                </View>
                <View>
                  <Text style={[s.stopLabel, { color: stopColor }]}>
                    {currentStop.label} — {currentStop.address?.split(",")[0]}
                  </Text>
                  <Text style={{ fontSize: 12, color: GRAY, fontFamily: "Inter" }}>
                    {currentStop.clients.length} client{currentStop.clients.length !== 1 ? "s" : ""} at this location
                  </Text>
                </View>
              </View>
              {currentStop.time ? (
                <Text style={{ fontSize: 12, fontWeight: "600", color: GRAY, fontFamily: "Inter-SemiBold" }}>{currentStop.time}</Text>
              ) : null}
            </View>

            {/* Map */}
            <MapPlaceholder address={currentStop.address} color={stopColor} />

            {/* Open Full Navigation */}
            <Pressable
              onPress={() => openMaps(currentStop.address)}
              style={[s.navBtn, { backgroundColor: stopColor }]}
            >
              <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.navBtnText}>Open Full Navigation</Text>
            </Pressable>

            {/* Arrived at visit button */}
            {isVisit && !visitArrived && (
              <Pressable
                onPress={() => setVisitArrived(true)}
                style={[s.navBtn, { backgroundColor: BLUE, marginTop: 8 }]}
              >
                <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.navBtnText}>I've Arrived at Visit</Text>
              </Pressable>
            )}

            {/* Client confirmation for pickups/drops */}
            {(isPickup || isDrop) && currentStop.clients.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: DARK, marginBottom: 8, fontFamily: "Inter-SemiBold" }}>
                  Confirm each client {isPickup ? "pickup" : "drop-off"}:
                </Text>
                {currentStop.clients.map((c) => (
                  <ClientStatusRow
                    key={c.id}
                    client={c}
                    status={clientStatus[`${currentIdx}_${c.id}`] || "waiting"}
                    onConfirm={() => setStatus(currentIdx, c.id, "confirmed")}
                    onCancel={() => {
                      Alert.alert(
                        "Mark as unavailable?",
                        `${c.name} will be marked as not available at this stop.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Confirm", style: "destructive", onPress: () => setStatus(currentIdx, c.id, "cancelled") },
                        ]
                      );
                    }}
                    actionLabel={actionLabel}
                    confirmedLabel={confirmLabel}
                  />
                ))}
              </View>
            )}

            {/* Visit arrived confirmation + notes */}
            {isVisit && visitArrived && (
              <View style={{ marginTop: 14, gap: 12 }}>
                <View style={{ backgroundColor: BLUE_LIGHT, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#BFDBFE" }}>
                  <Ionicons name="checkmark-circle" size={20} color={BLUE} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: BLUE, fontFamily: "Inter-SemiBold", flex: 1 }}>
                    Arrived at visit. Add notes below, then tap Ready to Leave.
                  </Text>
                </View>
                {/* Visit Notes */}
                <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Ionicons name="document-text-outline" size={16} color={BLUE} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: DARK, fontFamily: "Inter-Bold" }}>
                      Visit Notes
                    </Text>
                    <View style={{ backgroundColor: "#EFF6FF", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: BLUE, letterSpacing: 0.5 }}>OPTIONAL</Text>
                    </View>
                  </View>
                  <TextInput
                    value={visitNotes}
                    onChangeText={setVisitNotes}
                    placeholder="Record observations, client behaviour, any incidents during this visit..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{
                      borderWidth: 1.5,
                      borderColor: "#DBEAFE",
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 14,
                      color: DARK,
                      minHeight: 100,
                      backgroundColor: "#F8FAFF",
                      fontFamily: "Inter",
                      lineHeight: 20,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: GRAY, marginTop: 6, fontFamily: "Inter" }}>
                    These notes will be included in the shift report.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
      <View style={s.bottomBar}>
        <Pressable
          onPress={ctaConfig.disabled ? undefined : advanceStop}
          style={[s.ctaBtn, { backgroundColor: ctaConfig.color }, ctaConfig.disabled && { opacity: 0.6 }]}
          disabled={ctaConfig.disabled}
        >
          <Text style={s.ctaBtnText}>{ctaConfig.text}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: DARK, fontFamily: "Poppins-SemiBold" },
  headerSub: { fontSize: 12, color: GRAY, fontFamily: "Inter", marginTop: 1 },
  kmBadge: { backgroundColor: GREEN_LIGHT, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#86EFAC" },
  kmText: { fontSize: 13, fontWeight: "700", color: GREEN, fontFamily: "Inter-Bold" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: DARK, fontFamily: "Inter-Bold" },

  stopIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stopLabel: { fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },

  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 13,
  },
  navBtnText: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Poppins-SemiBold" },

  miniAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 10 },
  miniAvatarText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter-Bold" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 16,
  },
  ctaBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Poppins-SemiBold" },
});
