import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { safeString, toDate, formatCanadaTime, parseDate, formatShiftTimeUTCtoCanada } from "../src/utils/date";
import IntakeView from "./_IntakeView";

import CriticalIncidentModel from "../src/components/CriticalIncidentModel";
import MedicalContactLogModal from "../src/components/MedicalContactLogModal";
import FollowThroughModal from "../src/components/FollowThroughModal";
import NoteworthyEventModal from "../src/components/NoteworthyEventModal";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
const ERROR_RED = "#EF4444";
const ERROR_BG = "#FEF2F2";

const serviceTypeStyles = {
  "Respite Care": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Emergent Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Emergency Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  "Transportation": { bg: "#FEF9C3", text: "#854D0E" },
  default: { bg: "#DCFCE7", text: "#15803D" },
};


// ── Helper: 15-minute time rounding ──────────────────────────────────────────
const getRoundedTime = () => {
  const coeff = 1000 * 60 * 15;
  const rounded = new Date(Math.round(new Date().getTime() / coeff) * coeff);
  return rounded.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true,
    timeZone: "America/Edmonton" 
  });
};

// ── Helper: Get current location string ──────────────────────────────────────
const getLocationString = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return "Location unavailable";
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const geocode = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (geocode.length > 0) {
      const g = geocode[0];
      return `${g.streetNumber || ""} ${g.street || g.name || ""}, ${g.city || ""}`.trim();
    }
    return `Lat: ${loc.coords.latitude.toFixed(4)}, Lon: ${loc.coords.longitude.toFixed(4)}`;
  } catch {
    return "Location unavailable";
  }
};

// ── Helper: Send notification to Firestore ───────────────────────────────────
const sendNotification = async (receiverId, payload) => {
  try {
    await addDoc(collection(db, "notifications", receiverId, "userNotifications"), {
      ...payload,
      read: false,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Notification send failed:", e);
  }
};

// ── Helper: Format date for display ─────────────────────────────────────────
const formatDisplayDate = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return dateStr || "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = (target - today) / 86400000;
  const formatted = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (diff === 0) return `Today · ${formatted}`;
  if (diff === 1) return `Tomorrow · ${formatted}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  return `${weekday} · ${formatted}`;
};

// ── Helper: Calculate duration ───────────────────────────────────────────────
const calcDuration = (start, end) => {
  if (!start || !end) return "—";
  const parseTime = (t) => {
    if (!t) return 0;
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    return h + (m || 0) / 60;
  };
  const diff = parseTime(end) - parseTime(start);
  const hours = diff > 0 ? diff : diff + 24;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
};

const isNumericId = (val) => val && /^\d+$/.test(String(val)) && String(val).length > 8;

export default function ShiftDetails() {
  const { shiftId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftLocked, setShiftLocked] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intakeData, setIntakeData] = useState(null);
  const [reportText, setReportText] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // ── Fetch Intake Form ───────────────────────────────────────────
  const fetchIntakeForm = async () => {
    try {
      const clientId = shift?.clientId || shift?.clientDetails?.id;
      const intakeId = shift?.id || shift?.intakeId || shift?.InTakeFormId;
      const clientName = shift?.clientName || shift?.name || shift?.clientDetails?.name || shift?.familyName || shift?.childName;

      if (!clientId && !intakeId && !clientName) {
        Alert.alert("Missing Info", "Insufficient client information to find intake form.");
        return;
      }

      let matchedIntake = null;

      // 1. Direct check using Document ID or intakeId
      if (intakeId) {
        const snap = await getDoc(doc(db, "InTakeForms", String(intakeId)));
        if (snap.exists()) matchedIntake = { ...snap.data(), id: snap.id };
        if (!matchedIntake) {
          const snap2 = await getDoc(doc(db, "clients", String(intakeId)));
          if (snap2.exists()) matchedIntake = { ...snap2.data(), id: snap2.id };
        }
      }

      // 2. Comprehensive Search across all intake forms and clients
      if (!matchedIntake) {
        const collections = ["InTakeForms", "clients"];
        const cleanClientName = clientName ? clientName.trim().toLowerCase() : null;

        for (const collName of collections) {
          if (matchedIntake) break;
          const snapshot = await getDocs(collection(db, collName));
          
          snapshot.docs.some((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            // ID Match
            const possibleIds = new Set([docId, data.clientId, data.formId, data.id, data.InTakeFormId, data.intakeId].filter(Boolean).map(id => String(id)));
            const targetIds = [clientId, intakeId].filter(Boolean).map(id => String(id));

            if (targetIds.some(tid => possibleIds.has(tid))) {
              matchedIntake = { ...data, id: docId };
              return true;
            }

            // Name Match
            if (cleanClientName) {
              const possibleNames = new Set();
              [data.clientName, data.name, data.nameInClientTable, data.familyName, data.nameOfPerson, data.childName]
                .forEach(n => n && possibleNames.add(n?.toString().toLowerCase().trim()));

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

              if (Array.from(possibleNames).some(fn => fn && (fn.includes(cleanClientName) || cleanClientName.includes(fn)))) {
                matchedIntake = { ...data, id: docId };
                return true;
              }
            }
            return false;
          });
        }
      }

      if (matchedIntake) {
        setIntakeData(matchedIntake);
        setShowIntakeModal(true);
      } else {
        Alert.alert("Not Found", "No intake form found for this client. Please check the name or ID matching.");
      }
    } catch (e) {
      console.error("Intake fetch failed:", e);
      Alert.alert("Error", "Failed to load intake form.");
    }
  };

  // Load user from storage
  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        const uid = u.userId || u.uid || u.id;
        if (uid) {
          try {
            const q = query(collection(db, "users"), where("userId", "==", uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
              setStaffInfo(snap.docs[0].data());
            } else if (u.username) {
              const q2 = query(collection(db, "users"), where("username", "==", typeof u.username === "string" ? u.username : ""));
              const snap2 = await getDocs(q2);
              if (!snap2.empty) setStaffInfo(snap2.docs[0].data());
            }
          } catch (e) {
            console.error("Error fetching staff info:", e);
          }
        }
      }
    };
    load();
  }, []);

  // Real-time shift listener
  useEffect(() => {
    if (!shiftId) return;
    const unsub = onSnapshot(doc(db, "shifts", shiftId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setShift({ id: snap.id, ...data });
        setShiftLocked(data.shiftLocked || false);
        // Load existing shiftReport if it's there
        if (data.shiftReport && !reportText) {
          setReportText(data.shiftReport);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [shiftId]);

  // Fetch client details for medication checks
  useEffect(() => {
    if (!shift || !shift.clientId) return;
    const loadClient = async () => {
      try {
        const docSnap = await getDoc(doc(db, "clients", String(shift.clientId)));
        if (docSnap.exists()) {
          setClientInfo(docSnap.data());
        } else {
          const cq = query(collection(db, "clients"), where("clientId", "==", shift.clientId));
          const snap = await getDocs(cq);
          if (!snap.empty) setClientInfo(snap.docs[0].data());
        }
      } catch (e) {
        console.error("Failed to fetch client info:", e);
      }
    };
    loadClient();
  }, [shift?.clientId]);

  // Fetch intake data for shift description fallback
  useEffect(() => {
    if (!shift) return;
    const fetchIntake = async () => {
      try {
        const clientId = shift.clientId || shift.clientDetails?.id;
        const intakeId = shift.id || shift.intakeId || shift.InTakeFormId;
        const clientName = shift.clientName || shift.name || shift.clientDetails?.name || shift.familyName || shift.childName;

        let matched = null;

        // 1. Direct ID Resolve
        if (intakeId) {
          const snap = await getDoc(doc(db, "InTakeForms", String(intakeId)));
          if (snap.exists()) matched = { ...snap.data(), id: snap.id };
          if (!matched) {
            const snap2 = await getDoc(doc(db, "clients", String(intakeId)));
            if (snap2.exists()) matched = { ...snap2.data(), id: snap2.id };
          }
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
                  .forEach(n => n && possibleNames.add(n?.toString().toLowerCase().trim()));

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

        if (matched) setIntakeData(matched);
      } catch (e) {
        console.error("Auto intake fetch error:", e);
      }
    };
    fetchIntake();
  }, [shift]);

  const intakeDescription = intakeData?.services?.serviceDesc || 
                            intakeData?.serviceDesc || 
                            (Array.isArray(intakeData?.serviceRequired) ? intakeData.serviceRequired.join(", ") : intakeData?.serviceRequired) || 
                            intakeData?.serviceDetail || 
                            "";

  const displayDescription = shift?.jobdescription || shift?.description || shift?.shiftDescription || shift?.notes || clientInfo?.serviceDesc || clientInfo?.jobDescription || intakeDescription;

  const getStatus = () => {
    if (shift?.clockOutTime || shift?.clockOut || shift?.clockout || shift?.status === "completed") return "completed";
    if (shift?.clockInTime || shift?.clockIn || shift?.clockin || shift?.status === "active") return "in-progress";
    return shift?.shiftConfirmed ? "upcoming" : "assigned";
  };

  const shiftStatus = getStatus();

  // ── Core action handler with location + notifications ─────────────────────
  const handleAction = async () => {
    if (!confirmAction || !shift || shiftLocked) return;
    const { type } = confirmAction;
    setIsProcessing(true);

    try {
      // Always use the URL param shiftId as the Firestore document ID
      const ref = doc(db, "shifts", shiftId);

      if (type === "confirm") {
        await updateDoc(ref, {
          shiftConfirmed: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: user?.name || user?.username,
        });

        // Notify admin
        const adminId = user?.agencyId || user?.adminId || "admin";
        await sendNotification(adminId, {
          title: "Shift Confirmed",
          message: `${user?.name || "Staff"} confirmed their shift on ${shift.startDate}`,
          type: "schedule",
          category: "Schedule",
          icon: "checkmark-circle",
          iconColor: PRIMARY_GREEN,
          iconBg: "#F0FDF4",
        });
      } else if (type === "clockIn") {
        const roundedTime = getRoundedTime();
        const locationStr = await getLocationString();

        await updateDoc(ref, {
          clockInTime: roundedTime,
          clockInDate: new Date().toISOString(),
          clockInLocation: locationStr,
        });

        // Self notification for clock-in record
        await sendNotification(user?.username || user?.userId, {
          title: "Clocked In",
          message: `You clocked in at ${roundedTime} for your ${shift.category || "shift"} at ${locationStr}`,
          type: "shift",
          category: "Shifts",
          icon: "time-outline",
          iconColor: PRIMARY_GREEN,
          iconBg: "#F0FDF4",
        });
      } else if (type === "clockOut") {
        const roundedTime = getRoundedTime();
        const locationStr = await getLocationString();

        await updateDoc(ref, {
          clockOutTime: roundedTime,
          clockOutDate: new Date().toISOString(),
          clockOutLocation: locationStr,
        });

        // Self notification for clock-out record
        await sendNotification(user?.username || user?.userId, {
          title: "Clocked Out",
          message: `You clocked out at ${roundedTime}. Great work on your ${shift.category || "shift"}!`,
          type: "shift",
          category: "Shifts",
          icon: "checkmark-circle",
          iconColor: "#10B981",
          iconBg: "#F0FDF4",
        });
      }
    } catch (e) {
      console.error("Action failed:", e);
      Alert.alert("Error", "Failed to update shift. Please try again.");
    }

    setIsProcessing(false);
    setConfirmAction(null);

    // Navigate to specialized transportation screen if applicable
    if (type === "clockIn") {
      const catRaw = shift.category || shift.serviceType || shift.categoryName || shift.shiftCategory || "";
      const catLower = catRaw.toLowerCase();
      // Only route to transportation screen for pure transportation shifts (not supervised visitation)
      const isTransport = catLower.includes("transportation") && !catLower.includes("supervised") && !catLower.includes("visitation");
      const hasTransit = !catLower.includes("supervised") && !catLower.includes("visitation") &&
        (shift.pickupLocation || shift.dropLocation || (shift.description && shift.description.toLowerCase().includes("pick up")));

      if (isTransport || hasTransit) {
        router.push({ pathname: "/transportation-shift-detail", params: { shiftId } });
      }
    }
  };

  // ── Report handler ──────────────────────────────────────────────────────
  const handleUpdateReport = async (isSubmit = false) => {
    if (!reportText.trim()) return;
    setSavingReport(true);
    try {
      const ref = doc(db, "shifts", shiftId);
      await updateDoc(ref, {
        shiftReport: reportText,
        reportLastSaved: serverTimestamp(),
        ...(isSubmit && { reportSubmitted: true, status: "completed" })
      });
      if (isSubmit) {
        Alert.alert("Success", "Daily Shift Report has been submitted successfully.");
      } else {
        Alert.alert("Draft Saved", "Your shift report has been saved as a draft.");
      }
    } catch (e) {
      console.error("Report save failed:", e);
      Alert.alert("Error", "Failed to save report. Please check your connection.");
    }
    setSavingReport(false);
  };

  // ── Shift lock handler ────────────────────────────────────────────────────

  // ── Shift lock handler ────────────────────────────────────────────────────
  const handleLockToggle = async (val) => {
    setShiftLocked(val);
    try {
      await updateDoc(doc(db, "shifts", shiftId), { shiftLocked: val });
    } catch (e) {
      setShiftLocked(!val);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={PRIMARY_GREEN} />;
  if (!shift) return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="alert-circle-outline" size={50} color="#D1D5DB" />
        <Text style={{ color: GRAY_TEXT, marginTop: 15 }}>Shift not found</Text>
      </View>
    </SafeAreaView>
  );

  // Resolve true name (favor Intake records if shift name is a numeric ID)
  const rawName = safeString(shift?.familyName || shift?.childName || shift?.clientName || shift?.name || shift?.client || shift?.clientDetails?.name);
  const intakeName = (() => {
    if (!intakeData) return "";
    if (intakeData.clients && typeof intakeData.clients === "object" && !Array.isArray(intakeData.clients)) {
      const names = Object.values(intakeData.clients).map(c => c.fullName || c.name || "").filter(Boolean);
      if (names.length) return names.join(", ");
    }
    // Try inTakeClients array
    if (Array.isArray(intakeData.inTakeClients)) {
      const names = intakeData.inTakeClients.map(c => c.name || "").filter(Boolean);
      if (names.length) return names.join(", ");
    }
    return safeString(intakeData.clientName || intakeData.name || intakeData.familyName || intakeData.nameInClientTable || intakeData.childName);
  })();
  
  const clientName = (isNumericId(rawName) && intakeName) ? intakeName : (rawName || intakeName || "Client");
  const clientId = safeString(shift.clientId || shift.clientDetails?.id || intakeData?.clientId || intakeData?.formId) || "\u2014";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const staffName = user?.name || "Staff Member";
  const staffInitials = staffName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  let rawServiceType = safeString(shift.category || shift.categoryName || shift.serviceType || shift.shiftCategory) || "Respite Care";
  // Auto-detect Transportation if miscategorized but has transit markers
  const hasTransitMarkers = shift.pickupLocation || shift.dropLocation || shift.visitLocation || 
                           (shift.description && shift.description.toLowerCase().includes("pick up")) ||
                           (shift.description && shift.description.toLowerCase().includes("drop to"));
  if ((rawServiceType === "Respite Care" || !rawServiceType) && hasTransitMarkers) {
    rawServiceType = "Transportation";
  }
  const serviceStyle = serviceTypeStyles[rawServiceType] || serviceTypeStyles.default;
  const duration = calcDuration(shift.startTime, shift.endTime);
  const displayDate = formatDisplayDate(shift.startDate);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.navigate("/shifts")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Shift Details</Text>
          <Text style={styles.headerSubtitle}>{displayDate}</Text>
        </View>
        <Pressable style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={GRAY_TEXT} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Status Banner ──────────────────────────────────────────────── */}
        {shiftStatus === "assigned" && (
          <View style={[styles.banner, { backgroundColor: "#FFF7ED" }]}>
            <Ionicons name="time-outline" size={18} color="#92400E" />
            <Text style={[styles.bannerText, { color: "#92400E" }]}>Assigned · Awaiting Your Confirmation</Text>
          </View>
        )}
        {shiftStatus === "upcoming" && (
          <View style={[styles.banner, { backgroundColor: LIGHT_GREEN }]}>
            <Ionicons name="checkmark-circle" size={18} color={TEXT_GREEN} />
            <Text style={[styles.bannerText, { color: TEXT_GREEN }]}>Confirmed · Ready to Clock In</Text>
          </View>
        )}
        {shiftStatus === "in-progress" && (
          <View style={[styles.banner, { backgroundColor: "#EBF5FF" }]}>
            <Ionicons name="radio-button-on" size={18} color="#1D4ED8" />
            <Text style={[styles.bannerText, { color: "#1D4ED8" }]}>In Progress · Clocked in at {formatCanadaTime(shift.clockInTime)}</Text>
          </View>
        )}
        {shiftStatus === "completed" && (
          <View style={[styles.banner, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={[styles.bannerText, { color: "#10B981" }]}>Completed · {formatCanadaTime(shift.clockOutTime)}</Text>
          </View>
        )}

        {/* ── Client-Staff Pairing ────────────────────────────────────────── */}
        <View style={styles.pairingBox}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarGroup}>
              <View style={[styles.avatar, { backgroundColor: LIGHT_GREEN }]}>
                <Text style={[styles.avatarText, { color: TEXT_GREEN }]}>{clientInitials}</Text>
              </View>
              <Text style={styles.nameLabel}>{clientName}</Text>
              <Text style={styles.idLabel}>ID: {clientId}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
            <View style={styles.avatarGroup}>
              <View style={[styles.avatar, { backgroundColor: "#F3F0FF" }]}>
                <Text style={[styles.avatarText, { color: "#5B21B6" }]}>{staffInitials}</Text>
              </View>
              <Text style={styles.nameLabel}>{staffName}</Text>
              <Text style={styles.idLabel}>Staff ID: {staffInfo?.staffId || user?.staffId || "—"}</Text>
            </View>
          </View>
          <View style={[styles.serviceTag, { backgroundColor: serviceStyle.bg, alignSelf: "center", marginTop: 15 }]}>
            <Text style={[styles.serviceTagText, { color: serviceStyle.text }]}>{rawServiceType}</Text>
          </View>
          <View style={styles.divider} />
          <Pressable style={styles.idLink} onPress={() => router.push("/staff-id-card")}>
            <Ionicons name="card-outline" size={16} color={PRIMARY_GREEN} />
            <Text style={styles.idLinkText}>Show ID Card to Parent</Text>
          </Pressable>
        </View>

        {/* ── Info Grid ──────────────────────────────────────────────────── */}
        <View style={styles.infoGrid}>
          <GridRow label="SHIFT TYPE" value={rawServiceType} />
          <GridRow label="DATE" value={displayDate} />
          <GridRow label="TIME" value={`${formatShiftTimeUTCtoCanada(shift.startDate, shift.startTime)} – ${formatShiftTimeUTCtoCanada(shift.startDate, shift.endTime)}`} />
          <GridRow label="DURATION" value={duration} isLast />
        </View>

        {/* ── Family Members / Children (Shift Points) ── */}
        {( (Array.isArray(shift?.shiftPoints) && shift.shiftPoints.length > 0) || (Array.isArray(clientInfo?.shiftPoints) && clientInfo.shiftPoints.length > 0) ) && (
          <View style={[styles.sectionCard, { marginTop: 15 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Ionicons name="people-outline" size={18} color={PRIMARY_GREEN} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Family Members / Children</Text>
            </View>
            {(shift?.shiftPoints || clientInfo?.shiftPoints).map((member, mIdx) => (
              <View key={`member-${mIdx}`} style={{ 
                padding: 12, 
                backgroundColor: "#F9FAFB", 
                borderRadius: 12, 
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#F3F4F6"
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" }}>
                    {member.name || `Member ${mIdx + 1}`}
                  </Text>
                  {member.seatType && (
                    <View style={{ backgroundColor: "#FEF9C3", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#854D0E" }}>{member.seatType}</Text>
                    </View>
                  )}
                </View>
                {(member.pickupLocation || member.dropLocation) && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {member.pickupLocation && (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", width: 50 }}>PICKUP:</Text>
                        <Text style={{ fontSize: 11, color: "#4B5563", flex: 1 }}>{member.pickupLocation}</Text>
                      </View>
                    )}
                    {member.visitLocation && (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", width: 50 }}>VISIT:</Text>
                        <Text style={{ fontSize: 11, color: "#4B5563", flex: 1 }}>{member.visitLocation}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Shift Description ──────────────────────────────────────────── */}
        <View style={[styles.sectionCard, { marginTop: 15 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="information-circle-outline" size={18} color={PRIMARY_GREEN} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Shift Description</Text>
            </View>
            <Pressable onPress={fetchIntakeForm}>
              <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 13 }}>View Intake Form</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, fontFamily: "Inter", marginTop: 4 }}>
            {displayDescription || "No specific description provided for this shift."}
          </Text>
        </View>

        {/* ── Shift Lock ─────────────────────────────────────────────────── */}
        <View style={styles.lockRow}>
          <View style={styles.lockLabelBox}>
            <Ionicons name="lock-closed-outline" size={18} color={GRAY_TEXT} />
            <View>
              <Text style={styles.lockTitle}>Shift Lock</Text>
              <Text style={styles.lockSubtitle}>Prevents accidental modifications</Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: "#E5E7EB", true: LIGHT_GREEN }}
            thumbColor={shiftLocked ? PRIMARY_GREEN : "#FFF"}
            onValueChange={handleLockToggle}
            value={shiftLocked}
          />
        </View>

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        <View style={[styles.sectionCard, { marginTop: 15 }]}>
          <Text style={styles.sectionTitle}>Shift Timeline</Text>
          <TimelineItem
            title="Shift Confirmed"
            subtitle={shift.confirmedAt ? `Confirmed by ${safeString(shift.confirmedBy) || staffName}` : "Awaiting confirmation"}
            time={shift.confirmedAt ? (() => { const d = toDate(shift.confirmedAt); return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"; })() : "—"}
            completed={!!shift.shiftConfirmed}
          />
          <TimelineItem
            title="Clock In"
            subtitle={shift.clockInTime ? `Location: ${shift.clockInLocation || "Verified"}` : `Scheduled: ${shift.startTime || "—"}`}
            time={formatCanadaTime(shift.clockInTime)}
            completed={!!shift.clockInTime}
          />
          <TimelineItem
            title="In Progress"
            subtitle={shift.clockInTime && !shift.clockOutTime ? "Currently active" : "Shift duration"}
            time={shift.clockInTime && !shift.clockOutTime ? `~${duration}` : "—"}
            completed={!!shift.clockInTime}
          />
          <TimelineItem
            title="Clock Out"
            subtitle={shift.clockOutTime ? `Location: ${shift.clockOutLocation || "Verified"}` : `Scheduled: ${shift.endTime || "—"}`}
            time={formatCanadaTime(shift.clockOutTime)}
            completed={!!shift.clockOutTime}
            isLast
          />
        </View>

        {/* ── Daily Shift Report Card ─────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Daily Shift Report</Text>
          <Text style={styles.sectionDesc}>Document activities, medications, meals, mood, interactions...</Text>
          
          {shiftStatus === "assigned" || shiftStatus === "upcoming" ? (
            <View style={styles.lockedReportBox}>
              <Ionicons name="lock-closed-outline" size={32} color="#D1D5DB" />
              <Text style={styles.lockedReportText}>Report available after clock-in</Text>
            </View>
          ) : (
            <View>

              <TextInput
                style={[
                  styles.reportInput, 
                  (shiftLocked || shift?.reportSubmitted) && { backgroundColor: "#F3F4F6", color: "#6B7280" }
                ]}
                placeholder="Type your shift report here..."
                placeholderTextColor={GRAY_TEXT}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={reportText}
                onChangeText={setReportText}
                editable={!shiftLocked && !shift?.reportSubmitted}
              />
              
              {shift?.reportSubmitted ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, marginBottom: 10 }}>
                  <Ionicons name="checkmark-circle" size={16} color={PRIMARY_GREEN} />
                  <Text style={{ color: PRIMARY_GREEN, fontSize: 13, fontWeight: "700", fontFamily: "Inter-Bold" }}>Report submitted successfully</Text>
                </View>
              ) : !shiftLocked && (
                <View style={styles.reportBtnRow}>
                  <Pressable 
                    style={[styles.reportBtn, { backgroundColor: "#F3F4F6" }]} 
                    onPress={() => handleUpdateReport(false)}
                    disabled={savingReport}
                  >
                    <Text style={[styles.reportBtnText, { color: DARK_TEXT }]}>Save Draft</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.reportBtn, { backgroundColor: PRIMARY_GREEN }]} 
                    onPress={() => handleUpdateReport(true)}
                    disabled={savingReport}
                  >
                    <Text style={[styles.reportBtnText, { color: "#FFF" }]}>Submit Report</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Shift Actions ──────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 15 }]}>Shift Actions</Text>
        
        {(clientInfo?.medicalNotes || clientInfo?.medications || clientInfo?.specialNeeds || clientInfo?.allergies || clientInfo?.conditions) && (
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push({ pathname: "/shift-medications", params: { shiftId: shift.id } })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#FFFBEB" }]}>
              <Ionicons name="medkit-outline" size={22} color="#92400E" />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Medications</Text>
              <Text style={styles.actionSubtitle}>Log administered medications & view schedule</Text>
            </View>
            <View style={styles.actionRight}>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </View>
          </Pressable>
        )}
        <Pressable
          style={styles.actionCard}
          onPress={() => router.push({ pathname: "/shift-transportations", params: { shiftId: shift.id } })}
        >
          <View style={[styles.actionIconBox, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="car-outline" size={22} color="#1D4ED8" />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Transportation</Text>
            <Text style={styles.actionSubtitle}>Log kilometers, routes & upload receipts</Text>
          </View>
          <View style={styles.actionRight}>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </View>
        </Pressable>

        {/* ── Other Actions (Visible when Confirmed or In-Progress) ── */}
        {shiftStatus !== "assigned" && (
          <View style={{ marginTop: 15 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Other Actions</Text>
            
            <Pressable style={[styles.otherActionCard, { borderLeftColor: "#DC2626" }]} onPress={() => setActiveModal("critical")}>
              <View style={styles.otherActionHeader}>
                <Ionicons name="alert-circle-outline" color="#DC2626" size={20} />
                <Text style={styles.otherActionTitle}>Critical Incident Reporting</Text>
              </View>
              <Text style={styles.otherActionDesc}>For serious incident requiring immediate management attention</Text>
              <Text style={[styles.otherActionHighlight, { color: "#DC2626" }]}>Self-harm, violence, abuse allegations, serious accidents, medication errors..</Text>
              <View style={[styles.otherActionBtn, { backgroundColor: "#DC2626" }]}>
                <Text style={styles.otherActionBtnText}>Report Critical Incident</Text>
              </View>
            </Pressable>

            <Pressable style={[styles.otherActionCard, { borderLeftColor: "#1D4ED8" }]} onPress={() => setActiveModal("medical")}>
              <View style={styles.otherActionHeader}>
                <Ionicons name="document-text-outline" color="#1D4ED8" size={20} />
                <Text style={styles.otherActionTitle}>Medical Contact Log</Text>
              </View>
              <Text style={styles.otherActionDesc}>Record any medical contacts or health-related communications during your shift</Text>
              <View style={[styles.otherActionBtn, { backgroundColor: "#1D4ED8" }]}>
                <Text style={styles.otherActionBtnText}>Log Medical Contact</Text>
              </View>
            </Pressable>

            <Pressable style={[styles.otherActionCard, { borderLeftColor: "#F59E0B" }]} onPress={() => setActiveModal("noteworthy")}>
              <View style={styles.otherActionHeader}>
                <Ionicons name="star-outline" color="#F59E0B" size={20} />
                <Text style={styles.otherActionTitle}>Noteworthy Event</Text>
              </View>
              <Text style={styles.otherActionDesc}>Document any unusual but non-critical events or observations</Text>
              <View style={[styles.otherActionBtn, { backgroundColor: "#F59E0B" }]}>
                <Text style={styles.otherActionBtnText}>Log Noteworthy Event</Text>
              </View>
            </Pressable>

            <Pressable style={[styles.otherActionCard, { borderLeftColor: "#10B981" }]} onPress={() => setActiveModal("follow")}>
              <View style={styles.otherActionHeader}>
                <Ionicons name="checkmark-circle-outline" color="#10B981" size={20} />
                <Text style={styles.otherActionTitle}>Follow Through</Text>
              </View>
              <Text style={styles.otherActionDesc}>Record details about following through on specific tasks or care plans</Text>
              <View style={[styles.otherActionBtn, { backgroundColor: "#10B981" }]}>
                <Text style={styles.otherActionBtnText}>Log Follow Through</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ── Primary Action Button ───────────────────────────────────────── */}
        <View style={styles.actionBlock}>
          {shiftStatus === "assigned" && (
            <>
              <Pressable
                onPress={() => setConfirmAction({ type: "confirm" })}
                style={styles.outlineBtn}
                disabled={shiftLocked}
              >
                <Text style={styles.outlineBtnText}>Confirm Shift</Text>
              </Pressable>
              <Text style={styles.actionHint}>Confirm to let the owner know you'll attend</Text>
            </>
          )}
          {shiftStatus === "upcoming" && (
            <>
              <Pressable
                onPress={() => setConfirmAction({ type: "clockIn" })}
                style={styles.solidBtn}
                disabled={shiftLocked}
              >
                <Text style={styles.solidBtnText}>Clock In</Text>
              </Pressable>
              <Text style={styles.actionHint}>Your location will be captured (rounded to 15 min)</Text>
            </>
          )}
          {shiftStatus === "in-progress" && (
            <>
              <Pressable
                onPress={() => setConfirmAction({ type: "clockOut" })}
                style={[styles.solidBtn, { backgroundColor: ERROR_RED }]}
                disabled={shiftLocked}
              >
                <Text style={styles.solidBtnText}>Clock Out</Text>
              </Pressable>
              <Text style={styles.actionHint}>Clocked in at {shift.clockInTime} · {shift.clockInLocation}</Text>
            </>
          )}
          {shiftStatus === "completed" && (
            <Pressable
              onPress={() => router.push({ pathname: "/shift-completion", params: { shiftId: shift.id } })}
              style={[styles.solidBtn, { backgroundColor: "#10B981" }]}
            >
              <Text style={styles.solidBtnText}>View Shift Report</Text>
            </Pressable>
          )}
          {shiftLocked && (
            <Text style={[styles.actionHint, { color: ERROR_RED, marginTop: 10 }]}>
              🔒 Shift is locked. Toggle to unlock.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ── Form Modals ─────────────────────────────────────────────────── */}
      <CriticalIncidentModel
        visible={activeModal === "critical"}
        onClose={() => setActiveModal(null)}
        shift={shift}
      />
      <MedicalContactLogModal
        visible={activeModal === "medical"}
        onClose={() => setActiveModal(null)}
        shift={shift}
      />
      <NoteworthyEventModal
        visible={activeModal === "noteworthy"}
        onClose={() => setActiveModal(null)}
        shift={shift}
      />
      <FollowThroughModal
        visible={activeModal === "follow"}
        onClose={() => setActiveModal(null)}
        shift={shift}
      />

      {/* ── Confirmation Modal ────────────────────────────────────────────── */}
      {confirmAction && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {confirmAction.type === "confirm" ? (
                // SS1: High-fidelity confirmation
                <>
                  <View style={styles.successCircle}>
                    <Ionicons name="checkmark" size={32} color={TEXT_GREEN} />
                  </View>
                  <Text style={styles.modalTitle}>Confirm this shift?</Text>
                  
                  <View style={styles.modalSummaryBox}>
                    <Text style={styles.summaryPrimary}>{rawServiceType} · {clientName}</Text>
                    <Text style={styles.summarySecondary}>{shift.startDate} · {shift.startTime} – {shift.endTime}</Text>
                    <Text style={styles.summarySecondary}>{shift.location || "Location TBD"}</Text>
                  </View>

                  <Text style={styles.modalDesc}>
                    By confirming, you acknowledge this shift assignment and commit to attending.
                  </Text>
                </>
              ) : confirmAction.type === "clockIn" ? (
                // SS2 inspired: Clock In styling
                <>
                  <View style={[styles.successCircle, { backgroundColor: "#EBF5FF" }]}>
                    <Ionicons name="log-in-outline" size={32} color="#1D4ED8" />
                  </View>
                  <Text style={styles.modalTitle}>Confirm clock-in at {formatCanadaTime(new Date().toISOString())}?</Text>
                  <Text style={styles.modalDesc}>
                    Your location and time will be recorded. {"\n"}
                    <Text style={{ fontWeight: "700", color: "#1D4ED8" }}>Note:</Text> If clocking in early, payroll will reflect the scheduled start time of {shift.startTime}.
                  </Text>
                </>
              ) : (
                // Clock Out
                <>
                  <View style={[styles.successCircle, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="log-out-outline" size={32} color={ERROR_RED} />
                  </View>
                  <Text style={styles.modalTitle}>Clock Out?</Text>
                  <Text style={styles.modalDesc}>
                    Finalizing your shift will record your end time and current location.
                  </Text>
                </>
              )}

              <Pressable 
                onPress={handleAction} 
                style={[
                  styles.modalActionBtn, 
                  confirmAction.type === "confirm" && { backgroundColor: PRIMARY_GREEN },
                  confirmAction.type === "clockIn" && { backgroundColor: "#1D4ED8" },
                  confirmAction.type === "clockOut" && { backgroundColor: ERROR_RED }
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalActionBtnText}>
                    {confirmAction.type === "confirm" ? "Yes, Confirm Shift" : confirmAction.type === "clockIn" ? "Confirm Clock In" : "Yes, Clock Out"}
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={() => setConfirmAction(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Intake Form Modal ────────────────────────────────────────── */}
      <Modal visible={showIntakeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#FFF" }}>
          {/* Header */}
          <View style={{ 
            flexDirection: "row", 
            alignItems: "center", 
            paddingHorizontal: 20, 
            paddingTop: 60, // Manual top padding for Notch/Island
            paddingBottom: 15,
            borderBottomWidth: 1, 
            borderBottomColor: "#E5E7EB"
          }}>
            <Pressable onPress={() => setShowIntakeModal(false)} style={{ padding: 5 }}>
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
            <IntakeView intakeData={intakeData} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function GridRow({ label, value, rightIcon, isLast }) {
  return (
    <View style={[styles.gridRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.gridLabel}>{label}</Text>
      <View style={styles.gridValueBox}>
        <Text style={styles.gridValue}>{value}</Text>
        {rightIcon && <Ionicons name={rightIcon} size={14} color={PRIMARY_GREEN} style={{ marginLeft: 6 }} />}
      </View>
    </View>
  );
}

function TimelineItem({ title, subtitle, time, completed, isLast }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, completed && styles.timelineDotActive]}>
          {completed && <Ionicons name="checkmark" size={10} color="#FFF" />}
        </View>
        {!isLast && <View style={[styles.timelineLine, completed && { backgroundColor: PRIMARY_GREEN }]} />}
      </View>
      <View style={styles.timelineBody}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>{title}</Text>
          <Text style={styles.timelineTime}>{time}</Text>
        </View>
        <Text style={styles.timelineSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#F8F8F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter", marginTop: 2 },
  backBtn: { padding: 4 },
  menuBtn: { padding: 4 },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, marginTop: 5, marginBottom: 15 },
  bannerText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter-Bold", flex: 1 },

  pairingBox: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: GRAY_BORDER },
  avatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatarGroup: { alignItems: "center", width: "40%" },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { fontSize: 16, fontWeight: "800" },
  nameLabel: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, textAlign: "center", fontFamily: "Inter-Bold" },
  idLabel: { fontSize: 11, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  serviceTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  serviceTagText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter-Bold" },
  divider: { height: 1, backgroundColor: GRAY_BORDER, marginVertical: 15 },
  idLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  idLinkText: { fontSize: 13, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },

  infoGrid: { marginTop: 20, borderWidth: 1, borderColor: GRAY_BORDER, borderRadius: 20, padding: 20 },
  gridRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  gridLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "700", fontFamily: "Inter-Bold" },
  gridValueBox: { flex: 1, alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end" },
  gridValue: { fontSize: 13, color: DARK_TEXT, fontWeight: "600", textAlign: "right", fontFamily: "Inter-SemiBold" },

  lockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderRadius: 20, borderWidth: 1, borderColor: GRAY_BORDER, marginTop: 15 },
  lockLabelBox: { flexDirection: "row", alignItems: "center", gap: 12 },
  lockTitle: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  lockSubtitle: { fontSize: 11, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },

  sectionCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: GRAY_BORDER, marginTop: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, fontFamily: "Poppins-Bold", marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: GRAY_TEXT, marginBottom: 15, fontFamily: "Inter", lineHeight: 18 },
  
  lockedReportBox: { height: 120, backgroundColor: "#F9FAFB", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", alignItems: "center", justifyContent: "center", gap: 8 },
  lockedReportText: { fontSize: 13, color: "#9CA3AF", fontFamily: "Inter-Medium" },

  reportInput: { backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", padding: 12, fontSize: 14, color: DARK_TEXT, fontFamily: "Inter", height: 120, marginBottom: 12 },
  reportBtnRow: { flexDirection: "row", gap: 10 },
  reportBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reportBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },

  timelineItem: { flexDirection: "row" },
  timelineLeft: { alignItems: "center", width: 22, marginRight: 15 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", zIndex: 2 },
  timelineDotActive: { borderColor: PRIMARY_GREEN, backgroundColor: PRIMARY_GREEN },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#E5E7EB", marginVertical: 2, minHeight: 30 },
  timelineBody: { flex: 1, paddingBottom: 25 },
  timelineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timelineTitle: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  timelineTime: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },
  timelineSubtitle: { fontSize: 12, color: GRAY_TEXT, marginTop: 4, fontFamily: "Inter" },

  actionGrid: { marginTop: 20 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  actionSubtitle: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter", marginTop: 2 },
  actionCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: "#FFF", borderWidth: 1, borderColor: GRAY_BORDER, marginBottom: 12 },
  actionIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  actionBody: { flex: 1 },
  actionRight: { marginLeft: 8 },

  otherActionCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: GRAY_BORDER, borderLeftWidth: 4, marginBottom: 15 },
  otherActionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  otherActionTitle: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  otherActionDesc: { fontSize: 13, color: GRAY_TEXT, lineHeight: 18, fontFamily: "Inter" },
  otherActionHighlight: { fontSize: 12, fontWeight: "600", marginTop: 10, fontFamily: "Inter-SemiBold" },
  otherActionBtn: { marginTop: 15, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  otherActionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },

  actionBlock: { paddingTop: 20, paddingBottom: 40 },
  solidBtn: { height: 56, width: "100%", backgroundColor: "#22C55E", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  solidBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
  outlineBtn: { height: 56, width: "100%", borderRadius: 16, borderWidth: 2, borderColor: PRIMARY_GREEN, alignItems: "center", justifyContent: "center" },
  outlineBtnText: { color: PRIMARY_GREEN, fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
  actionHint: { fontSize: 12, color: GRAY_TEXT, textAlign: "center", marginTop: 12, fontFamily: "Inter" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 32, padding: 32, width: "100%", alignItems: "center" },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: DARK_TEXT, textAlign: "center", marginBottom: 12, fontFamily: "Poppins-Bold" },
  modalSummaryBox: { alignItems: "center", marginBottom: 20 },
  summaryPrimary: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, marginBottom: 4, fontFamily: "Inter-Bold" },
  summarySecondary: { fontSize: 14, color: "#6B7280", marginBottom: 2, fontFamily: "Inter" },
  modalDesc: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 30, fontFamily: "Inter" },
  modalActionBtn: { height: 56, borderRadius: 16, backgroundColor: PRIMARY_GREEN, justifyContent: "center", alignItems: "center", width: "100%", marginBottom: 16 },
  modalActionBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
  modalCancelBtn: { padding: 8 },
  modalCancelText: { fontSize: 15, color: "#9CA3AF", fontWeight: "600", fontFamily: "Inter-SemiBold" },
});

