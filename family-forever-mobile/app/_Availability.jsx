import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  updateDoc,
  getDoc,
  deleteField,
  serverTimestamp,
  getDocs,
  query,
  collection,
  where,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { useLocalSearchParams, useRouter } from "expo-router";

/* ===================== */
/* CONSTANTS */
/* ===================== */

const SERVICES = [
  { key: "emergentCare", label: "Emergent Care" },
  { key: "respiteCare", label: "Respite Care" },
  { key: "transportations", label: "Transportations" },
  { key: "supervisedVisitations", label: "Supervised Visitations" },
];

const PERIODS = [
  { key: "morning", label: "Morning", time: "06:00 - 14:00", icon: "☀️" },
  { key: "evening", label: "Evening", time: "14:00 - 22:00", icon: "🌇" },
  { key: "night", label: "Night", time: "22:00 - 06:00", icon: "🌙" },
];

const EMPTY_DAY = {
  morning: {
    emergentCare: false,
    respiteCare: false,
    transportations: false,
    supervisedVisitations: false,
  },
  evening: {
    emergentCare: false,
    respiteCare: false,
    transportations: false,
    supervisedVisitations: false,
  },
  night: {
    emergentCare: false,
    respiteCare: false,
    transportations: false,
    supervisedVisitations: false,
  },
};

/* ===================== */
/* HELPERS */
/* ===================== */

const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const isPastDate = (date) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < t;
};

// ✅ highlight only if there is at least ONE true in that day
const dayHasAnyTrue = (day) => {
  if (!day) return false;
  return PERIODS.some((p) =>
    SERVICES.some((s) => Boolean(day?.[p.key]?.[s.key]))
  );
};

const formatHeader = (d) =>
  d.toLocaleString(undefined, { month: "long", year: "numeric" });

const formatSelectedTitle = (d) =>
  `${d.toLocaleString(undefined, { weekday: "long" })} (${pad2(
    d.getDate()
  )}-${d.toLocaleString(undefined, { month: "short" })}-${d.getFullYear()})`;

/* ===================== */
/* CHECKBOX */
/* ===================== */

function Checkbox({ checked }) {
  return (
    <View
      style={{
        height: 22,
        width: 22,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: checked ? "#047857" : "#cbd5e1",
        backgroundColor: checked ? "#047857" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
      pointerEvents="none"
    >
      {checked ? (
        <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
          ✓
        </Text>
      ) : null}
    </View>
  );
}

/* ===================== */
/* MAIN COMPONENT */
/* ===================== */

export default function Availability() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);

  // ✅ Separate saved vs draft to avoid “auto-saved UI”
  const [savedAvailability, setSavedAvailability] = useState({});
  const [draftAvailability, setDraftAvailability] = useState({});

  const selectedKey = toDateKey(selectedDate);
  const selectedAvailability = draftAvailability[selectedKey] || EMPTY_DAY;

  /* ===== LOAD EXISTING AVAILABILITY ===== */
  useEffect(() => {
    const load = async () => {
      if (!userId) return;

      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        const data = snap.data()?.availability || {};
        setSavedAvailability(data);
        // deep copy into draft so edits don’t affect “saved”
        setDraftAvailability(JSON.parse(JSON.stringify(data)));
      }
    };
    load();
  }, [userId]);

  /* ===== CALENDAR GRID ===== */
  const calendarCells = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const firstDay = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - firstDay);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return { date: d, inMonth: d.getMonth() === monthCursor.getMonth() };
    });
  }, [monthCursor]);

  /* ===== TOGGLES ===== */
  const toggleService = (period, service) => {
    setDraftAvailability((prev) => {
      const prevDay = prev[selectedKey] || EMPTY_DAY;
      return {
        ...prev,
        [selectedKey]: {
          ...prevDay,
          [period]: {
            ...prevDay[period],
            [service]: !prevDay[period][service],
          },
        },
      };
    });
  };

  // ✅ Clear all removes the date key entirely (so it won’t highlight)
  const clearAllForDay = () => {
    setDraftAvailability((prev) => {
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
  };

  const isDayEmpty = (day) =>
  !Object.values(day).some(period =>
    Object.values(period).some(Boolean)
  );

  const clone = (obj) => JSON.parse(JSON.stringify(obj || {}));



  /* ===== SAVE ===== */
 

const saveAvailability = async () => {
  try {
    console.log("SAVE BUTTON PRESSED");

    if (!userId) {
      Alert.alert("Error", "User not found. Please login again.");
      return;
    }

    const q = query(collection(db, "users"), where("userId", "==", userId));
    const qs = await getDocs(q);

    if (qs.empty) {
      Alert.alert("Error", "User record not found.");
      return;
    }

    const userDoc = qs.docs[0];
    const userRef = userDoc.ref;

    const todayKey = toDateKey(new Date());
    const existing = userDoc.data().availability || {};
    const updates = {};

    Object.keys(existing).forEach((k) => {
      if (k < todayKey) {
        updates[`availability.${k}`] = deleteField();
      }
    });

    const dayData = draftAvailability[selectedKey];

    if (!dayData || isDayEmpty(dayData)) {
      updates[`availability.${selectedKey}`] = deleteField();
    } else {
      updates[`availability.${selectedKey}`] = dayData;
    }

    updates.updatedAt = serverTimestamp();

    await updateDoc(userRef, updates);

    // ✅ ADD THIS BLOCK HERE (updates UI immediately)
    const nextSaved = clone(savedAvailability);

    // remove old past keys locally too
    Object.keys(existing).forEach((k) => {
      if (k < todayKey) delete nextSaved[k];
    });

    if (!dayData || isDayEmpty(dayData)) {
      delete nextSaved[selectedKey];
    } else {
      nextSaved[selectedKey] = dayData;
    }

    setSavedAvailability(nextSaved);
    setDraftAvailability(clone(nextSaved));
    // ✅ END BLOCK

    Alert.alert("Saved", "Availability updated successfully");
  } catch (err) {
    console.error("SAVE ERROR:", err);
    Alert.alert("Error", "Failed to save availability");
  }
};
 
  /* ===================== */
  /* UI */
  /* ===================== */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView   keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        {/* Header */}
        <View
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
        >
          <Pressable onPress={() => router.back()} style={{ paddingRight: 10 }}>
            <Ionicons name="arrow-back" size={24} />
          </Pressable>
          <Text style={{ fontSize: 22, fontWeight: "700" }}>
            Set Your Availability
          </Text>
        </View>

        {/* Calendar */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Pressable onPress={() => setMonthCursor(addMonths(monthCursor, -1))}>
              <Text style={{ fontSize: 20 }}>‹</Text>
            </Pressable>
            <Text style={{ fontWeight: "700" }}>{formatHeader(monthCursor)}</Text>
            <Pressable onPress={() => setMonthCursor(addMonths(monthCursor, 1))}>
              <Text style={{ fontSize: 20 }}>›</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
            {calendarCells.map(({ date, inMonth }) => {
              const key = toDateKey(date);
              const past = isPastDate(date);
              const selected = isSameDay(date, selectedDate);

              // ✅ highlight ONLY saved days that have at least one true
              const savedDay = savedAvailability[key];
              const hasSavedAvail = dayHasAnyTrue(savedDay);

              let bg = "transparent";
              let color = inMonth ? "#0f172a" : "#cbd5e1";

              if (past) color = "#cbd5e1";
              else if (selected) {
                bg = "#059669";
                color = "white";
              } else if (hasSavedAvail) {
                bg = "#d1fae5";
                color = "#065f46";
              }

              return (
                <Pressable
                  key={key}
                  disabled={past}
                  onPress={() => {
  if (past) return;

  // ✅ discard unsaved edits when switching dates
  setDraftAvailability(clone(savedAvailability));
  setSelectedDate(date);
}}

                  style={{
                    width: "14.28%",
                    alignItems: "center",
                    padding: 6,
                    opacity: past ? 0.5 : 1,
                  }}
                >
                  <View
                    style={{
                      height: 38,
                      width: 38,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: bg,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color }}>
                      {date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Periods */}
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontWeight: "700", marginBottom: 10 }}>
            {formatSelectedTitle(selectedDate)}
          </Text>

          {PERIODS.map((p) => (
            <View
              key={p.key}
              style={{
                backgroundColor: "#f1f5f9",
                padding: 14,
                borderRadius: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                {p.icon} {p.label} ({p.time})
              </Text>

              {SERVICES.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => toggleService(p.key, s.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                  hitSlop={10}
                >
                  <View style={{ marginRight: 10 }}>
                    <Checkbox checked={selectedAvailability[p.key][s.key]} />
                  </View>
                  <Text>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 14,
          backgroundColor: "white",
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Pressable
          onPress={clearAllForDay}
          style={{
            flex: 1,
            borderWidth: 1,
            borderRadius: 16,
            padding: 12,
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "700" }}>
            Clear All
          </Text>
        </Pressable>

        <Pressable
          onPress={saveAvailability}
          style={{
            flex: 1,
            backgroundColor: "#047857",
            borderRadius: 16,
            padding: 12,
          }}
        >
          <Text style={{ textAlign: "center", color: "white", fontWeight: "700" }}>
            Save Availability
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
