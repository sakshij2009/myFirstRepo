import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
const PENDING_YELLOW = "#FEF9C3";
const PENDING_TEXT = "#854D0E";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_SHORTS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 22 && m > 0) break;
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekOffset = 0) {
  const today = new Date();
  const monday = getMondayOf(today);
  monday.setDate(monday.getDate() + weekOffset * 7);
  return DAY_KEYS.map((key, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      key,
      short: DAY_SHORTS[i],
      label: DAY_LABELS[i],
      date: String(d.getDate()),
      fullDate: d,
      dateStr: toDateStr(d),
      isToday: isSameDay(d, today),
    };
  });
}

function getWeekLabel(days) {
  if (!days.length) return "";
  const first = days[0].fullDate;
  const last = days[6].fullDate;
  const yr = first.getFullYear();
  if (first.getMonth() === last.getMonth()) {
    return `${MONTH_NAMES[first.getMonth()]} ${first.getDate()} \u2013 ${last.getDate()}, ${yr}`;
  }
  return `${MONTH_NAMES[first.getMonth()]} ${first.getDate()} \u2013 ${MONTH_NAMES[last.getMonth()]} ${last.getDate()}, ${yr}`;
}

function fmt12(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function slotHours(slot) {
  if (!slot?.start || !slot?.end) return 0;
  const [sh, sm] = slot.start.split(":").map(Number);
  const [eh, em] = slot.end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function computeStats(availData) {
  let availDays = 0;
  let totalHours = 0;
  DAY_KEYS.forEach((k) => {
    const day = availData?.[k];
    if (day?.available && day?.slots?.length) {
      availDays++;
      day.slots.forEach((s) => { totalHours += slotHours(s); });
    }
  });
  return { availDays, totalHours: Math.round(totalHours * 10) / 10 };
}

function parseShiftDate(shift) {
  const raw = shift.date || shift.startDate || shift.shiftDate;
  if (!raw) return null;
  if (typeof raw?.toDate === "function") return raw.toDate();
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

function getServiceColors(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("transport")) return { bg: "#FEF9C3", text: "#854D0E" };
  if (t.includes("respite")) return { bg: "#EFF6FF", text: "#1D4ED8" };
  if (t.includes("supervised") || t.includes("visit")) return { bg: "#F5F3FF", text: "#5B21B6" };
  if (t.includes("personal") || t.includes("support")) return { bg: "#FFF1F2", text: "#BE123C" };
  return { bg: "#F0FDF4", text: "#166534" };
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

function formatTORDate(req) {
  const parse = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    const d = new Date(v);
    return isNaN(d) ? null : d;
  };
  const start = parse(req.startDate);
  const end = parse(req.endDate);
  if (!start) return "";
  const fmt = (d) => `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  if (!end || isSameDay(start, end)) return fmt(start);
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}

function getTORStyle(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("vacation") || t.includes("annual")) return { icon: "sunny-outline", bg: "#FFF7ED", color: "#F59E0B" };
  if (t.includes("sick") || t.includes("medical")) return { icon: "medical-outline", bg: "#FFF1F2", color: "#EF4444" };
  if (t.includes("personal")) return { icon: "briefcase-outline", bg: "#EEF2FF", color: "#4F46E5" };
  if (t.includes("bereavement")) return { icon: "heart-outline", bg: "#FDF4FF", color: "#9333EA" };
  return { icon: "calendar-outline", bg: "#F3F4F6", color: GRAY_TEXT };
}

function getStatusBadgeStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return { bg: LIGHT_GREEN, textColor: TEXT_GREEN, icon: "checkmark-circle" };
  if (s === "denied" || s === "rejected") return { bg: "#FFF1F2", textColor: "#BE123C", icon: "close-circle" };
  return { bg: PENDING_YELLOW, textColor: PENDING_TEXT, icon: "time" };
}

function defaultEditDraft(existingData) {
  const draft = {};
  DAY_KEYS.forEach((k) => {
    const existing = existingData?.[k];
    draft[k] = {
      available: existing?.available ?? false,
      slots: existing?.slots?.length
        ? existing.slots.map((s) => ({ ...s }))
        : [{ start: "08:00", end: "17:00" }],
    };
  });
  return draft;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Availability() {
  const [activeTab, setActiveTab] = useState("AVAILABILITY");
  const [user, setUser] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDays, setWeekDays] = useState(() => getWeekDays(0));

  const [availData, setAvailData] = useState({});
  const [shifts, setShifts] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDraft, setEditDraft] = useState({});

  // Time picker state
  const [timePicker, setTimePicker] = useState(null); // { dayKey, slotIdx, field: "start"|"end" }

  // ── Derived ────────────────────────────────────────────────────────────────
  const weekStart = weekDays[0]?.dateStr;
  const weekLabel = getWeekLabel(weekDays);
  const isCurrentWeek = weekOffset === 0;

  const daysWithShifts = new Set(
    shifts
      .map((s) => { const d = parseShiftDate(s); return d ? toDateStr(d) : null; })
      .filter(Boolean)
  );

  const { availDays, totalHours } = computeStats(availData);
  const uniqueClients = [
    ...new Set(shifts.map((s) => s.clientId || s.clientName).filter(Boolean)),
  ].length;

  const shiftsByDay = weekDays.map((d) => ({
    day: d,
    shifts: shifts.filter((s) => {
      const sd = parseShiftDate(s);
      return sd && isSameDay(sd, d.fullDate);
    }),
  })).filter((g) => g.shifts.length > 0);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setWeekDays(getWeekDays(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  // Availability listener
  useEffect(() => {
    if (!user || !weekStart) return;
    const uid = user.userId || user.uid || user.id;
    const docId = `${uid}_${weekStart}`;
    const unsub = onSnapshot(
      doc(db, "availability", docId),
      (snap) => {
        setAvailData(snap.exists() ? (snap.data().days || {}) : {});
        setLoading(false);
      },
      (err) => {
        console.warn("Availability snapshot error:", err);
        setAvailData({});
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, weekStart]);

  // Time-off requests listener
  useEffect(() => {
    if (!user) return;
    const uid = user.userId || user.uid || user.id;
    const q = query(collection(db, "timeOffRequests"), where("userId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        reqs.sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return tb - ta;
        });
        setTimeOffRequests(reqs);
      },
      (err) => console.warn("timeOffRequests error:", err)
    );
    return () => unsub();
  }, [user]);

  // Shifts listener
  useEffect(() => {
    if (!user || !weekDays.length) return;
    const uid = user.userId || user.uid || user.id;
    const weekStartDate = weekDays[0].fullDate;
    const weekEndDate = new Date(weekDays[6].fullDate);
    weekEndDate.setHours(23, 59, 59, 999);

    const unsub = onSnapshot(query(collection(db, "shifts")), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = all.filter(
        (s) =>
          s.userId === uid ||
          (s.name && user.name && s.name.toLowerCase() === user.name.toLowerCase())
      );
      const weekShifts = mine.filter((s) => {
        const d = parseShiftDate(s);
        return d && d >= weekStartDate && d <= weekEndDate;
      });
      setShifts(weekShifts);
    });
    return () => unsub();
  }, [user, weekDays]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditDraft(defaultEditDraft(availData));
    setShowEditModal(true);
  };

  const toggleDayAvailable = (key) => {
    setEditDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], available: !prev[key]?.available },
    }));
  };

  const pickTime = (dayKey, slotIdx, field) => {
    setTimePicker({ dayKey, slotIdx, field });
  };

  const applyTime = (value) => {
    if (!timePicker) return;
    const { dayKey, slotIdx, field } = timePicker;
    setEditDraft((prev) => {
      const slots = [...(prev[dayKey]?.slots || [{ start: "08:00", end: "17:00" }])];
      slots[slotIdx] = { ...slots[slotIdx], [field]: value };
      return { ...prev, [dayKey]: { ...prev[dayKey], slots } };
    });
    setTimePicker(null);
  };

  const saveAvailability = async () => {
    if (!user || !weekStart) return;
    setSaving(true);
    try {
      const uid = user.userId || user.uid || user.id;
      await setDoc(
        doc(db, "availability", `${uid}_${weekStart}`),
        {
          userId: uid,
          userName: user.name || "",
          weekStart,
          days: editDraft,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setShowEditModal(false);
    } catch (e) {
      console.error("Save availability error:", e);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copyToNextWeek = () => {
    if (Object.keys(availData).length === 0) {
      Alert.alert("No Availability Set", "Set your availability for this week first.");
      return;
    }
    const nextMonday = new Date(weekDays[0].fullDate);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const nextStart = toDateStr(nextMonday);
    const nextLabel = `${MONTH_NAMES[nextMonday.getMonth()]} ${nextMonday.getDate()}`;

    Alert.alert(
      "Copy to Next Week",
      `Copy this week's availability to the week starting ${nextLabel}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: async () => {
            setSaving(true);
            try {
              const uid = user.userId || user.uid || user.id;
              await setDoc(
                doc(db, "availability", `${uid}_${nextStart}`),
                {
                  userId: uid,
                  userName: user.name || "",
                  weekStart: nextStart,
                  days: availData,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
              Alert.alert("Copied!", "Availability copied to next week.");
            } catch (e) {
              Alert.alert("Error", "Failed to copy availability.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // ── Render Availability Tab ────────────────────────────────────────────────
  const renderAvailability = () => (
    <View>
      {/* Week Selector */}
      <View style={styles.weekSelector}>
        <Pressable onPress={() => setWeekOffset((o) => o - 1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={GRAY_TEXT} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.dateRangeText}>{weekLabel}</Text>
          {isCurrentWeek && (
            <View style={styles.thisWeekBadge}>
              <Text style={styles.thisWeekText}>This Week</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => setWeekOffset((o) => o + 1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={GRAY_TEXT} />
        </Pressable>
      </View>

      {/* Stats Cards */}
      {loading ? (
        <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 30 }} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={18} color={PRIMARY_GREEN} />
              <Text style={styles.statText}>
                <Text style={{ fontWeight: "700", color: DARK_TEXT }}>{availDays} days</Text>
                {" "}available
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={18} color={PRIMARY_GREEN} />
              <Text style={styles.statText}>
                <Text style={{ fontWeight: "700", color: DARK_TEXT }}>{totalHours}h</Text>
                {" "}total
              </Text>
            </View>
          </View>

          {/* Grid Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridHeader}>
              {weekDays.map((d) => (
                <View key={d.key} style={styles.gridHeaderCol}>
                  <Text style={styles.gridDayLabel}>{d.short}</Text>
                  <View style={[styles.gridDateCircle, d.isToday && styles.gridDateCircleActive]}>
                    <Text style={[styles.gridDateText, d.isToday && { color: "#FFF" }]}>
                      {d.date}
                    </Text>
                  </View>
                  {daysWithShifts.has(d.dateStr) && !d.isToday && (
                    <View style={styles.gridDot} />
                  )}
                </View>
              ))}
            </View>
            <View style={styles.gridDivider} />
            <View style={styles.gridBody}>
              {weekDays.map((d) => {
                const dayAvail = availData[d.key];
                const isAvail = dayAvail?.available && dayAvail?.slots?.length;
                return (
                  <View key={d.key} style={styles.gridBodyCol}>
                    {isAvail ? (
                      dayAvail.slots.map((slot, i) => (
                        <View key={i} style={styles.timePill}>
                          <Text style={styles.timePillText}>{fmt12(slot.start)}</Text>
                          <Text style={styles.timePillText}>{fmt12(slot.end)}</Text>
                        </View>
                      ))
                    ) : (
                      <Ionicons name="moon-outline" size={16} color="#D1D5DB" />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable onPress={copyToNextWeek} disabled={saving} style={styles.outlineBtn}>
              {saving ? (
                <ActivityIndicator color={PRIMARY_GREEN} size="small" />
              ) : (
                <Text style={styles.outlineBtnText}>Copy to Next Week</Text>
              )}
            </Pressable>
            <Pressable onPress={openEditModal} style={styles.solidBtn}>
              <Text style={styles.solidBtnText}>Edit Availability</Text>
            </Pressable>
          </View>

          {/* Time-Off Requests */}
          <View style={styles.timeOffSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Time-Off Requests</Text>
              <Pressable onPress={() => router.push("/request-time-off")}>
                <Text style={styles.newRequestLink}>+ New Request</Text>
              </Pressable>
            </View>

            {timeOffRequests.length === 0 ? (
              <View style={styles.emptyTimeOff}>
                <Ionicons name="sunny-outline" size={32} color="#D1D5DB" />
                <Text style={styles.emptyTimeOffText}>No time-off requests yet</Text>
              </View>
            ) : (
              timeOffRequests.map((req) => {
                const torStyle = getTORStyle(req.type);
                const statusStyle = getStatusBadgeStyle(req.status);
                return (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={[styles.requestIcon, { backgroundColor: torStyle.bg }]}>
                      <Ionicons name={torStyle.icon} size={20} color={torStyle.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.requestHeader}>
                        <Text style={styles.requestTitleText}>{req.type || "Time Off"}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Ionicons name={statusStyle.icon} size={12} color={statusStyle.textColor} />
                          <Text style={[styles.statusBadgeText, { color: statusStyle.textColor }]}>
                            {req.status || "Pending"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.requestDateText}>{formatTORDate(req)}</Text>
                      {!!req.reason && (
                        <Text style={styles.requestSubtext}>{req.reason}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </View>
  );

  // ── Render Overview Tab ────────────────────────────────────────────────────
  const renderOverview = () => (
    <View>
      {/* Stats Strip */}
      <View style={styles.overviewStatsStrip}>
        <View style={styles.overviewStatItem}>
          <Text style={styles.overviewStatValue}>{shifts.length}</Text>
          <Text style={styles.overviewStatLabel}>Shifts</Text>
        </View>
        <View style={styles.overviewStatDivider} />
        <View style={styles.overviewStatItem}>
          <Text style={styles.overviewStatValue}>{totalHours}h</Text>
          <Text style={styles.overviewStatLabel}>Available Hrs</Text>
        </View>
        <View style={styles.overviewStatDivider} />
        <View style={styles.overviewStatItem}>
          <Text style={styles.overviewStatValue}>{uniqueClients}</Text>
          <Text style={styles.overviewStatLabel}>Clients</Text>
        </View>
      </View>

      {/* Week Selector Overview */}
      <View style={styles.overviewWeekSelector}>
        <Pressable onPress={() => setWeekOffset((o) => o - 1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={GRAY_TEXT} />
        </Pressable>
        {weekDays.map((d) => (
          <View key={d.key} style={styles.overviewDayItem}>
            <Text style={styles.overviewDayLabel}>{d.short}</Text>
            <View style={[styles.overviewDateCircle, d.isToday && styles.overviewDateCircleActive]}>
              <Text style={[styles.overviewDateText, d.isToday && { color: "#FFF" }]}>
                {d.date}
              </Text>
            </View>
            {daysWithShifts.has(d.dateStr) && !d.isToday && (
              <View style={styles.overviewDot} />
            )}
          </View>
        ))}
        <Pressable onPress={() => setWeekOffset((o) => o + 1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={GRAY_TEXT} />
        </Pressable>
      </View>

      {/* Shift Feed */}
      <View style={styles.shiftFeed}>
        {loading ? (
          <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 30 }} />
        ) : shiftsByDay.length === 0 ? (
          <View style={styles.emptyOverview}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyOverviewTitle}>No shifts this week</Text>
            <Text style={styles.emptyOverviewSub}>
              Your scheduled shifts will appear here once assigned.
            </Text>
          </View>
        ) : (
          shiftsByDay.map(({ day, shifts: dayShifts }) => (
            <View key={day.dateStr}>
              <Text style={styles.dayHeader}>
                {day.short}, {MONTH_NAMES[day.fullDate.getMonth()]} {day.date}
                {"  "}
                <Text style={{ color: GRAY_TEXT, fontWeight: "500" }}>
                  {dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}
                </Text>
              </Text>

              {dayShifts.map((shift) => {
                const svcType =
                  shift.serviceType ||
                  shift.category ||
                  shift.categoryName ||
                  shift.shiftCategory ||
                  "Shift";
                const colors = getServiceColors(svcType);
                const clientName =
                  shift.clientName || shift.name || "Client";
                const initials = getInitials(clientName);
                const startT = shift.startTime || shift.clockInTime || "";
                const endT = shift.endTime || shift.clockOutTime || "";
                const timeRange = startT
                  ? endT
                    ? `${startT} \u2013 ${endT}`
                    : startT
                  : "\u2013";
                const loc = shift.location || shift.address || shift.pickupLocation || "";

                return (
                  <Pressable
                    key={shift.id}
                    style={styles.shiftListCard}
                    onPress={() => router.push({ pathname: "/shifts", params: { shiftId: shift.id } })}
                  >
                    <View style={styles.shiftListTop}>
                      <View style={[styles.serviceTag, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.serviceTagText, { color: colors.text }]}>
                          {svcType}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.shiftListTime}>{timeRange}</Text>
                    <View style={styles.shiftListClient}>
                      <View style={styles.clientAvatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <Text style={styles.clientLabel}>{clientName}</Text>
                    </View>
                    {!!loc && (
                      <View style={styles.shiftListLocation}>
                        <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
                        <Text style={styles.locationLabel}>{loc}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </View>
    </View>
  );

  // ── Main Return ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Availability</Text>
          <Text style={styles.headerSubtitle}>{user?.name || "Staff"} · Staff</Text>
        </View>
        <Pressable onPress={() => setShowQuickActions(true)} style={styles.headerPlus}>
          <Ionicons name="add" size={28} color={PRIMARY_GREEN} />
        </Pressable>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab("AVAILABILITY")}
          style={[styles.tabItem, activeTab === "AVAILABILITY" && styles.tabItemActive]}
        >
          <Text style={[styles.tabItemText, activeTab === "AVAILABILITY" && styles.tabItemTextActive]}>
            My Availability
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("OVERVIEW")}
          style={[styles.tabItem, activeTab === "OVERVIEW" && styles.tabItemActive]}
        >
          <Text style={[styles.tabItemText, activeTab === "OVERVIEW" && styles.tabItemTextActive]}>
            Schedule Overview
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === "AVAILABILITY" ? renderAvailability() : renderOverview()}
      </ScrollView>

      {/* ── Quick Actions Modal ────────────────────────────────────────────── */}
      {showQuickActions && (
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowQuickActions(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Quick Actions</Text>

            <Pressable
              onPress={() => { setShowQuickActions(false); router.push("/request-time-off"); }}
              style={styles.modalOption}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="sunny-outline" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalOptionTitle}>Request Time Off</Text>
                <Text style={styles.modalOptionSubtitle}>Vacation, sick leave, or personal day</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>

            <Pressable
              onPress={() => { setShowQuickActions(false); router.push("/set-recurring-hours"); }}
              style={styles.modalOption}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="time-outline" size={22} color={PRIMARY_GREEN} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalOptionTitle}>Set Recurring Hours</Text>
                <Text style={styles.modalOptionSubtitle}>Define your default weekly schedule</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>

            <Pressable onPress={() => setShowQuickActions(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Edit Availability Modal ────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Edit Availability</Text>
              <Text style={styles.editWeekLabel}>{weekLabel}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {weekDays.map((d) => {
                const draft = editDraft[d.key] || { available: false, slots: [{ start: "08:00", end: "17:00" }] };
                const slot = draft.slots?.[0] || { start: "08:00", end: "17:00" };
                return (
                  <View key={d.key} style={styles.editDayRow}>
                    <View style={styles.editDayLeft}>
                      <Text style={styles.editDayLabel}>{d.label}</Text>
                      <Text style={styles.editDayDate}>
                        {MONTH_NAMES[d.fullDate.getMonth()]} {d.date}
                        {d.isToday ? " · Today" : ""}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end" }}>
                      {draft.available && (
                        <View style={styles.editTimeRow}>
                          <Pressable
                            onPress={() => pickTime(d.key, 0, "start")}
                            style={styles.timeChip}
                          >
                            <Text style={styles.timeChipText}>{fmt12(slot.start)}</Text>
                          </Pressable>
                          <Text style={styles.toText}>–</Text>
                          <Pressable
                            onPress={() => pickTime(d.key, 0, "end")}
                            style={styles.timeChip}
                          >
                            <Text style={styles.timeChipText}>{fmt12(slot.end)}</Text>
                          </Pressable>
                        </View>
                      )}
                      <Switch
                        value={draft.available}
                        onValueChange={() => toggleDayAvailable(d.key)}
                        trackColor={{ false: "#E5E7EB", true: LIGHT_GREEN }}
                        thumbColor={draft.available ? PRIMARY_GREEN : "#9CA3AF"}
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <Pressable onPress={() => setShowEditModal(false)} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveAvailability}
                disabled={saving}
                style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Time Picker Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={!!timePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setTimePicker(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setTimePicker(null)} />
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>
              Select {timePicker?.field === "start" ? "Start" : "End"} Time
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map((t) => {
                const isSelected =
                  timePicker &&
                  editDraft[timePicker.dayKey]?.slots?.[timePicker.slotIdx]?.[timePicker.field] === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => applyTime(t)}
                    style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                  >
                    <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                      {fmt12(t)}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={PRIMARY_GREEN} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: PAGE_BG,
  },
  headerBack: { padding: 4 },
  headerTitleBox: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 13, color: GRAY_TEXT, marginTop: 1, fontFamily: "Inter" },
  headerPlus: {
    backgroundColor: "#FFF",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    marginTop: 10,
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  tabItemActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabItemText: { fontSize: 14, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  tabItemTextActive: { color: DARK_TEXT, fontWeight: "700" },

  // Week Selector
  weekSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25,
  },
  dateRangeText: { fontSize: 17, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  thisWeekBadge: {
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  thisWeekText: { fontSize: 11, fontWeight: "700", color: TEXT_GREEN, fontFamily: "Inter-Bold" },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 16,
    padding: 16,
  },
  statText: { fontSize: 14, color: GRAY_TEXT, fontFamily: "Inter" },

  // Grid Card
  gridCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    paddingVertical: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },
  gridHeader: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8 },
  gridHeaderCol: { alignItems: "center" },
  gridDayLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 10, fontFamily: "Inter-Bold" },
  gridDateCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  gridDateCircleActive: { backgroundColor: PRIMARY_GREEN },
  gridDateText: { fontSize: 15, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  gridDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#22C55E", marginTop: 6 },
  gridDivider: { height: 1, backgroundColor: GRAY_BORDER, marginVertical: 18 },
  gridBody: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8 },
  gridBodyCol: { width: "12%", alignItems: "center", gap: 6 },
  timePill: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  timePillText: { fontSize: 7, fontWeight: "800", color: "#166534", fontFamily: "Inter-Bold" },

  // Action buttons
  actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginTop: 24 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { fontSize: 14, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  solidBtn: { flex: 1, backgroundColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  solidBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF", fontFamily: "Inter-Bold" },

  // Time Off
  timeOffSection: { paddingHorizontal: 20, marginTop: 36 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  newRequestLink: { fontSize: 14, color: PRIMARY_GREEN, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  requestCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  requestIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestTitleText: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: TEXT_GREEN, fontFamily: "Inter-Bold" },
  requestDateText: { fontSize: 13, color: GRAY_TEXT, marginTop: 4, fontFamily: "Inter" },
  requestSubtext: { fontSize: 13, color: GRAY_TEXT, marginTop: 4, fontFamily: "Inter" },
  emptyTimeOff: { alignItems: "center", paddingVertical: 32 },
  emptyTimeOffText: { fontSize: 14, color: GRAY_TEXT, marginTop: 10, fontFamily: "Inter" },

  // Overview
  overviewStatsStrip: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    justifyContent: "space-around",
    alignItems: "center",
  },
  overviewStatItem: { alignItems: "center" },
  overviewStatValue: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  overviewStatLabel: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  overviewStatDivider: { width: 1, height: 30, backgroundColor: GRAY_BORDER },
  overviewWeekSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25,
  },
  overviewDayItem: { alignItems: "center" },
  overviewDayLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 8 },
  overviewDateCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  overviewDateCircleActive: { backgroundColor: PRIMARY_GREEN },
  overviewDateText: { fontSize: 14, fontWeight: "700", color: DARK_TEXT },
  overviewDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY_GREEN, marginTop: 4 },
  shiftFeed: { paddingHorizontal: 20, marginTop: 28 },
  dayHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 14,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Inter-Bold",
  },
  shiftListCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  shiftListTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  serviceTagText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", fontFamily: "Inter-Bold" },
  shiftListTime: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, marginBottom: 14, fontFamily: "Poppins-Bold" },
  shiftListClient: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  clientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "800", color: GRAY_TEXT },
  clientLabel: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  shiftListLocation: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationLabel: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter", flex: 1 },
  emptyOverview: { alignItems: "center", paddingTop: 60, paddingBottom: 20 },
  emptyOverviewTitle: { fontSize: 17, fontWeight: "700", color: DARK_TEXT, marginTop: 16, fontFamily: "Poppins-Bold" },
  emptyOverviewSub: { fontSize: 13, color: GRAY_TEXT, textAlign: "center", marginTop: 8, fontFamily: "Inter", lineHeight: 20 },

  // Modal Sheet (shared)
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  modalOptionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalOptionTitle: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  modalOptionSubtitle: { fontSize: 13, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  modalCancelBtn: { backgroundColor: "#F3F4F6", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  modalCancelText: { fontSize: 15, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },

  // Edit Modal
  editWeekLabel: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },
  editDayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  editDayLeft: { flex: 0.4 },
  editDayLabel: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  editDayDate: { fontSize: 11, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  editTimeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeChip: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: LIGHT_GREEN,
  },
  timeChipText: { fontSize: 12, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  toText: { fontSize: 14, color: GRAY_TEXT, fontWeight: "600" },
  editCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: GRAY_BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  editCancelText: { fontSize: 15, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
  editSaveBtn: {
    flex: 1,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  editSaveText: { fontSize: 15, fontWeight: "700", color: "#FFF", fontFamily: "Inter-Bold" },

  // Time Picker
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  timeOptionSelected: { backgroundColor: "#F0FDF4", borderRadius: 10, paddingHorizontal: 12 },
  timeOptionText: { fontSize: 15, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold" },
  timeOptionTextSelected: { color: PRIMARY_GREEN, fontWeight: "800" },
});
