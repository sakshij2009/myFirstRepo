import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    Switch,
    Modal,
    StyleSheet,
    Dimensions,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    collection,
    onSnapshot,
    doc,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../../../src/firebase/config";
import { parseDate } from "../../../src/utils/date";
import { generateShiftReportPdf } from "../../../src/utils/shiftReportPdf";

// Live status from Firebase fields: completion phase (clockIn/clockOut)
// combined with confirmation (shiftConfirmed)
const deriveStatus = (shift) => {
    if (shift?.isCancelled) return { text: "Cancelled", bg: "#FEE2E2", color: "#DC2626" };
    const confirmed = shift?.shiftConfirmed === true;
    let phase, bg, color;
    if (shift?.clockIn && shift?.clockOut) { phase = "Completed"; bg = "#ECFDF5"; color = "#059669"; }
    else if (shift?.clockIn) { phase = "In Progress"; bg = "#DBEAFE"; color = "#2563EB"; }
    else { phase = "Upcoming"; bg = "#FEF3C7"; color = "#D97706"; }
    return { text: `${phase} • ${confirmed ? "Confirmed" : "Unconfirmed"}`, bg, color };
};

// Resolve any Firestore Timestamp / "04 Jan 2025" string / ISO / Date → JS Date
const toJsDate = (v) => parseDate(v);

// Shift date — prefer the reliable epoch (timeStampId), then the string fields.
// startDate is stored as "14 Jun 2026", which native new Date() can't parse.
const getShiftDate = (s) => {
    if (typeof s?.timeStampId === "number") return new Date(s.timeStampId);
    const fromStart = parseDate(s?.startDate);
    if (fromStart) return fromStart;
    if (typeof s?.dateKey === "string") {
        const m = s.dateKey.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); // DD-MM-YYYY
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    }
    return null;
};

// Compute the [start, end] window for a period selection
const getPeriodRange = (period, customFrom, customTo) => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    let start = new Date(now);
    if (period === "Monthly") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "Yearly") {
        start = new Date(now.getFullYear(), 0, 1);
    } else if (period === "Custom") {
        start = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const e = customTo ? new Date(customTo) : new Date(now);
        e.setHours(23, 59, 59, 999);
        return { start, end: e };
    } else {
        // Weekly — current calendar week (Sunday → today)
        start.setDate(start.getDate() - start.getDay());
    }
    start.setHours(0, 0, 0, 0);
    return { start, end };
};

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedPeriod, setSelectedPeriod] = useState("Weekly");
    const [showTopPeriodPicker, setShowTopPeriodPicker] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    // Shift-list date filter: single day when rangeEnd is null, else an inclusive range
    const [rangeStart, setRangeStart] = useState(new Date());
    const [rangeEnd, setRangeEnd] = useState(null);
    // Raw live collections
    const [shifts, setShifts] = useState([]);
    const [clients, setClients] = useState([]);
    const [agencies, setAgencies] = useState([]);
    // Custom date range (only used when selectedPeriod === "Custom")
    const [customFrom, setCustomFrom] = useState(null);
    const [customTo, setCustomTo] = useState(null);
    const [customPickerFor, setCustomPickerFor] = useState(null); // "from" | "to" | null

    useEffect(() => {
        AsyncStorage.getItem("user").then((stored) => {
            if (stored) setUser(JSON.parse(stored));
        }).catch(() => {});

        // Live listeners — dashboard stays fresh as data changes
        const unsubShifts = onSnapshot(collection(db, "shifts"), (snap) => {
            setShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }, (e) => console.warn("shifts listener:", e));
        const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
            setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }, (e) => console.warn("clients listener:", e));
        const unsubAgencies = onSnapshot(collection(db, "agencies"), (snap) => {
            setAgencies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }, (e) => console.warn("agencies listener:", e));

        return () => { unsubShifts(); unsubClients(); unsubAgencies(); };
    }, []);

    // ── Period-aware KPI metrics (recomputed live) ───────────────────────────
    const metrics = useMemo(() => {
        const { start, end } = getPeriodRange(selectedPeriod, customFrom, customTo);
        const inRange = (d) => d && d >= start && d <= end;

        let shiftsCompleted = 0;
        let transportCompleted = 0;
        shifts.forEach((s) => {
            const d = getShiftDate(s);
            if (!inRange(d)) return;
            const isCompleted = !!(s.clockIn && s.clockOut) || !!s.transportationCompleted;
            if (isCompleted && !s.isCancelled) shiftsCompleted++;
            const cat = (s.shiftCategory || s.categoryName || s.typeName || "").toLowerCase();
            if (cat.includes("transport") && (s.transportationCompleted || (s.clockIn && s.clockOut)) && !s.isCancelled) {
                transportCompleted++;
            }
        });

        const newClients = clients.filter((c) => inRange(toJsDate(c.createdAt))).length;
        const newAgencies = agencies.filter((a) => inRange(toJsDate(a.createdAt))).length;

        return [
            { icon: "checkmark-done", label: "Total Shifts Completed", value: String(shiftsCompleted) },
            { icon: "people", label: "Total Clients", value: String(clients.length) },
            { icon: "business", label: "New Agencies Added", value: String(newAgencies) },
            { icon: "person-add", label: "New Clients Added", value: String(newClients) },
            { icon: "car", label: "Total Transportation Completed", value: String(transportCompleted) },
        ];
    }, [shifts, clients, agencies, selectedPeriod, customFrom, customTo]);

    const fmtRangeLabel = (d) =>
        d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Select";

    const categories = [
        { id: "all", label: "All", color: "#2D5F3F" },
        { id: "respite", label: "Respite Care", color: "#4ECDC4" },
        { id: "emergency", label: "Emergent Care", color: "#FF4D6D" },
        { id: "visitation", label: "Supervised Visitation", color: "#FF9F1C" },
        { id: "transport", label: "Transportations", color: "#9D4EDD" },
    ];

    const periodOptions = ["Weekly", "Monthly", "Yearly", "Custom"];

    // Helper to check if two dates are same day
    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    // Filter shifts by category AND selected date
    const filteredShifts = shifts.filter((s) => {
        // 1. Category filter
        let categoryMatch = true;
        if (selectedCategory !== "all") {
            const cat = (s.shiftCategory || s.categoryName || "").toLowerCase();
            if (selectedCategory === "respite") categoryMatch = cat.includes("respite");
            else if (selectedCategory === "emergency") categoryMatch = cat.includes("emergent");
            else if (selectedCategory === "visitation") categoryMatch = cat.includes("supervised");
            else if (selectedCategory === "transport") categoryMatch = cat.includes("transport");
            else categoryMatch = true;
        }

        // 2. Date filter — single day, or inclusive range when rangeEnd is set
        let dateMatch = false;
        const shiftDate = getShiftDate(s);
        if (shiftDate) {
            const sd = new Date(shiftDate); sd.setHours(0, 0, 0, 0);
            const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
            if (rangeEnd) {
                const end = new Date(rangeEnd); end.setHours(0, 0, 0, 0);
                dateMatch = sd >= start && sd <= end;
            } else {
                dateMatch = sd.getTime() === start.getTime();
            }
        }

        return categoryMatch && dateMatch;
    });

    // Label for the calendar button (single date or range)
    const rangeLabel = rangeEnd
        ? `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${rangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const getCategoryColor = (category) => {
        const cat = (category || "").toLowerCase();
        if (cat.includes("respite")) return "#4ECDC4";
        if (cat.includes("emergent")) return "#FF4D6D";
        if (cat.includes("supervised")) return "#FF9F1C";
        if (cat.includes("transport")) return "#9D4EDD";
        if (cat.includes("office") || cat.includes("admin")) return "#6B7280";
        return "#2F6B4F";
    };

    const formatDate = (dateVal) => {
        const d = parseDate(dateVal);
        if (!d) return "";
        return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        const lower = timeStr.toLowerCase().trim();
        if (lower.includes("am") || lower.includes("pm")) return timeStr;
        const [h, m] = lower.split(":");
        let hour = parseInt(h);
        const min = m || "00";
        const ampm = hour >= 12 ? "PM" : "AM";
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour}:${min} ${ampm}`;
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ========== HEADER ========== */}
                <View style={s.header}>
                    {/* Top Nav Row */}
                    <View style={s.headerTop}>
                        <View style={s.logoCircle}>
                            <Image
                                source={require("../../../assets/Logo2.png")}
                                style={s.logoImg}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={s.headerRight}>
                            <Pressable style={s.notifBtn} onPress={() => { }}>
                                <Ionicons name="notifications" size={20} color="#fff" />
                            </Pressable>
                            <View style={s.profileCircle}>
                                {user?.profilePhotoUrl ? (
                                    <Image source={{ uri: user.profilePhotoUrl }} style={s.profileImg} />
                                ) : (
                                    <Ionicons name="person" size={20} color="#999" />
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Greeting */}
                    <View style={s.greetingSection}>
                        <Text style={s.dashLabel}>DASHBOARD</Text>
                        <Text style={s.greeting}>
                            Welcome back,{" "}
                            <Text style={s.greetingName}>
                                {user?.name?.split(" ")[0] || "Admin"}
                            </Text>
                        </Text>
                        <Text style={s.companyName}>FAMILY FOREVER INC.</Text>
                    </View>

                    {/* Weekly Selector - Premium Pill (from Figma design) */}
                    <View style={[s.weeklyRow, { zIndex: 10 }]}>
                        <View style={{ position: "relative" }}>
                            <Pressable
                                style={s.weeklyBtn}
                                onPress={() => setShowTopPeriodPicker(!showTopPeriodPicker)}
                            >
                                <Text style={s.weeklyText}>{selectedPeriod}</Text>
                                <Ionicons name="chevron-down" size={16} color="#2D5F3F" />
                            </Pressable>

                            {/* Period Dropdown */}
                            {showTopPeriodPicker && (
                                <View style={s.periodDropdown}>
                                    {periodOptions.map((option) => (
                                        <Pressable
                                            key={option}
                                            style={[
                                                s.periodOption,
                                                selectedPeriod === option && s.periodOptionActive,
                                            ]}
                                            onPress={() => {
                                                setSelectedPeriod(option);
                                                setShowTopPeriodPicker(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    s.periodOptionText,
                                                    selectedPeriod === option && { color: "#fff" },
                                                ]}
                                            >
                                                {option}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* ========== CUSTOM DATE RANGE (Custom period only) ========== */}
                {selectedPeriod === "Custom" && (
                    <View style={s.customRangeRow}>
                        <Pressable style={s.customDateBtn} onPress={() => setCustomPickerFor("from")}>
                            <Ionicons name="calendar-outline" size={15} color="#2D5F3F" />
                            <Text style={s.customDateLabel}>From</Text>
                            <Text style={s.customDateValue}>{fmtRangeLabel(customFrom)}</Text>
                        </Pressable>
                        <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                        <Pressable style={s.customDateBtn} onPress={() => setCustomPickerFor("to")}>
                            <Ionicons name="calendar-outline" size={15} color="#2D5F3F" />
                            <Text style={s.customDateLabel}>To</Text>
                            <Text style={s.customDateValue}>{fmtRangeLabel(customTo)}</Text>
                        </Pressable>
                    </View>
                )}

                {/* ========== METRICS CARDS - Horizontal Scroll ========== */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.metricsRow}
                >
                    {metrics.map((metric, i) => (
                        <MetricCard key={i} metric={metric} />
                    ))}
                </ScrollView>

                {/* ========== FILTER SECTION — date label + calendar icon at right ========== */}
                <View style={s.filterRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
                        <Text style={s.filterDateLabel} numberOfLines={1}>{rangeLabel}</Text>
                        {rangeEnd && (
                            <Pressable hitSlop={8} onPress={() => setRangeEnd(null)} style={s.clearRangeBtn}>
                                <Ionicons name="close" size={14} color="#9CA3AF" />
                            </Pressable>
                        )}
                    </View>
                    <Pressable style={s.calendarBtn} onPress={() => setIsCalendarOpen(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#2D5F3F" />
                    </Pressable>
                </View>

                {/* ========== CATEGORY TABS - Horizontal Scroll ========== */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.catRow}
                >
                    {categories.map((cat) => (
                        <Pressable
                            key={cat.id}
                            onPress={() => setSelectedCategory(cat.id)}
                            style={[
                                s.catBtn,
                                selectedCategory === cat.id && s.catBtnActive,
                            ]}
                        >
                            <Text
                                style={[
                                    s.catBtnText,
                                    selectedCategory === cat.id && s.catBtnTextActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* ========== SHIFT LIST ========== */}
                <View style={s.shiftSection}>
                    {filteredShifts.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Ionicons name="calendar-outline" size={48} color="#ccc" />
                            <Text style={s.emptyText}>No shifts found</Text>
                        </View>
                    ) : (
                        filteredShifts.map((shift) => (
                            <ShiftCard
                                key={shift.id}
                                shift={shift}
                                getCategoryColor={getCategoryColor}
                                formatDate={formatDate}
                                formatTime={formatTime}
                            />
                        ))
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Shift-list calendar — pick a single day or tap two dates for a range */}
            <CalendarModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                rangeMode
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onSelectRange={(start, end) => { setRangeStart(start); setRangeEnd(end); }}
                title="Select Date or Range"
            />

            {/* Custom range From/To picker (for the KPI period) */}
            <CalendarModal
                isOpen={customPickerFor !== null}
                onClose={() => setCustomPickerFor(null)}
                selectedDate={customPickerFor === "to" ? customTo : customFrom}
                onSelectDate={(d) => {
                    if (customPickerFor === "to") setCustomTo(d);
                    else setCustomFrom(d);
                }}
                title={customPickerFor === "to" ? "Select End Date" : "Select Start Date"}
            />
        </SafeAreaView>
    );
}

/* ========== METRIC CARD ========== */
function MetricCard({ metric }) {
    return (
        <View style={s.metricCard}>
            {/* Icon */}
            <View style={[s.metricIcon, { backgroundColor: "#F9F7F4" }]}>
                <Ionicons name={metric.icon} size={20} color="#2F6B4F" />
            </View>

            {/* Label */}
            <Text style={s.metricLabel}>{metric.label}</Text>

            {/* Value + Trend Row */}
            <View style={s.metricBottom}>
                <Text style={s.metricValue}>{metric.value}</Text>

                {/* Growth Badge */}
                {metric.trend && (
                    <View
                        style={[
                            s.trendBadge,
                            { backgroundColor: metric.up ? "#ECFDF5" : "#FEF2F2" },
                        ]}
                    >
                        <Ionicons
                            name={metric.up ? "arrow-up" : "arrow-down"}
                            size={12}
                            color={metric.up ? "#059669" : "#DC2626"}
                        />
                        <Text
                            style={[
                                s.trendText,
                                { color: metric.up ? "#059669" : "#DC2626" },
                            ]}
                        >
                            {metric.trend}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

/* ========== SHIFT CARD ========== */
function ShiftCard({ shift, getCategoryColor, formatDate, formatTime }) {
    const clientName = shift.clientDetails?.name || shift.clientName || "Unknown Client";
    const staffName = shift.userName || shift.name || "Unknown Staff";
    const clientId = shift.clientDetails?.id || shift.clientId || "—";
    const staffId = shift.userId || shift.staffId || "—";
    const category = shift.shiftCategory || shift.categoryName || shift.shiftType || "Standard";
    const catColor = getCategoryColor(category);
    const shiftType = shift.shiftType || shift.typeName || "Regular";
    const [locked, setLocked] = useState(!!shift.isRatified);

    const getInitials = (name) => {
        if (!name) return "??";
        return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    };

    const status = deriveStatus(shift);

    const handleDownload = async () => {
        try {
            const d = getShiftDate(shift);
            const dateLabel = d ? d.toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" }) : "";
            await generateShiftReportPdf({
                dateLabel,
                staffName,
                staffId,
                clientName,
                startTime: shift.startTime,
                endTime: shift.endTime,
                reportText: shift.shiftReport,
            });
        } catch (e) {
            Alert.alert("Download failed", e?.message || "Could not generate the PDF.");
        }
    };

    const handleDeleteShift = () => {
        Alert.alert("Delete Shift", "Are you sure you want to delete this shift? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try { await deleteDoc(doc(db, "shifts", shift.id)); }
                    catch (e) { Alert.alert("Error", "Could not delete the shift."); }
                },
            },
        ]);
    };

    return (
        <View style={s.shiftCard}>
            {/* Client → Staff Assignment */}
            <View style={s.shiftTop}>
                {/* Client */}
                <View style={s.personCol}>
                    <View style={[s.avatar, { backgroundColor: "#4ECDC4" }]}>
                        <Text style={s.avatarText}>{getInitials(clientName)}</Text>
                    </View>
                    <Text style={s.personName} numberOfLines={1}>{clientName}</Text>
                    <Text style={s.personSub}>ID: {clientId}</Text>
                </View>

                {/* Arrow */}
                <Ionicons name="arrow-forward" size={18} color="#ccc" style={{ marginHorizontal: 8 }} />

                {/* Staff */}
                <View style={s.personCol}>
                    <View style={[s.avatar, { backgroundColor: "#9D4EDD" }]}>
                        <Text style={s.avatarText}>{getInitials(staffName)}</Text>
                    </View>
                    <Text style={s.personName} numberOfLines={1}>{staffName}</Text>
                    <Text style={s.personSub}>Staff ID: {staffId}</Text>
                </View>
            </View>

            {/* Category Badge */}
            <View style={[s.catBadge, { backgroundColor: catColor }]}>
                <Text style={s.catBadgeText}>{category}</Text>
            </View>

            {/* Shift Details */}
            <View style={s.detailsBox}>
                <View style={s.detailRow}>
                    <Text style={s.detailLabel}>SHIFT TYPE</Text>
                    <Text style={s.detailValue}>{shiftType}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.detailRow}>
                    <Text style={s.detailLabel}>DATE & TIME</Text>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={s.detailValue}>{formatDate(shift.startDate)}</Text>
                        <Text style={s.detailTimeSub}>
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </Text>
                    </View>
                </View>
                <View style={s.divider} />
                <View style={s.detailRow}>
                    <Text style={s.detailLabel}>STATUS</Text>
                    <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[s.statusText, { color: status.color }]}>{status.text}</Text>
                    </View>
                </View>
            </View>

            {/* Shift Lock */}
            <View style={s.lockRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="lock-closed" size={16} color="#999" />
                    <Text style={s.lockText}>Shift Lock</Text>
                </View>
                <Switch
                    value={locked}
                    onValueChange={setLocked}
                    trackColor={{ false: "#d1d5db", true: "#2F6B4F" }}
                    thumbColor="#fff"
                />
            </View>

            {/* Action Buttons */}
            <View style={s.actionButtons}>
                <Pressable
                    style={s.viewReportBtn}
                    onPress={() => router.push({ pathname: "/admin/shift-detail", params: { shiftId: shift.id } })}
                >
                    <Text style={s.viewReportText}>View Report</Text>
                </Pressable>
                <Pressable style={s.iconBtn} onPress={() => router.push(`/admin/edit-shift?id=${shift.id}`)}>
                    <Ionicons name="create-outline" size={20} color="#2F6B4F" />
                </Pressable>
                <Pressable style={[s.iconBtn, { borderColor: "#FCA5A5" }]} onPress={handleDeleteShift}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
            </View>
        </View>
    );
}

/* ========== CALENDAR MODAL (single date OR range) ========== */
function CalendarModal({
    isOpen, onClose, selectedDate, onSelectDate, title = "Select Date",
    rangeMode = false, rangeStart, rangeEnd, onSelectRange,
}) {
    const [currentMonth, setCurrentMonth] = useState(
        (rangeMode ? rangeStart : selectedDate) || new Date()
    );

    if (!isOpen) return null;

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const dayToDate = (day) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const sameDay = (a, b) =>
        a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const handleDateClick = (day) => {
        const newDate = dayToDate(day);
        if (rangeMode) {
            // First tap (or restart) → set start, clear end.
            // Second tap → if after start, set end; if before/equal, restart at that day.
            if (!rangeStart || rangeEnd) {
                onSelectRange(newDate, null);
            } else if (newDate > rangeStart) {
                onSelectRange(rangeStart, newDate);
            } else {
                onSelectRange(newDate, null);
            }
        } else {
            onSelectDate(newDate);
        }
    };

    const isSelectedDate = (day) => {
        const d = dayToDate(day);
        if (rangeMode) return sameDay(d, rangeStart) || sameDay(d, rangeEnd);
        return sameDay(d, selectedDate);
    };

    // Day strictly between range endpoints (for the connecting highlight)
    const isInRange = (day) => {
        if (!rangeMode || !rangeStart || !rangeEnd) return false;
        const d = dayToDate(day);
        const a = new Date(rangeStart); a.setHours(0, 0, 0, 0);
        const b = new Date(rangeEnd); b.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d > a && d < b;
    };

    const isToday = (day) => {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getFullYear() === currentMonth.getFullYear()
        );
    };

    const renderCalendarDays = () => {
        const totalSlots = 42; // 6 weeks * 7 days to keep the grid perfectly uniform
        const days = [];

        // 1. Empty cells for days before month starts
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<View key={`empty-start-${i}`} style={s.calEmptyCell} />);
        }

        // 2. Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = isSelectedDate(day);
            const isTodayDate = isToday(day);
            const inRange = isInRange(day);

            let btnStyle = [s.calDayBtn]; // No longer applying s.calCell (which has flex: 1)
            let textStyle = [s.calDayText];

            if (isSelected) {
                btnStyle.push(s.calDaySelected);
                textStyle.push(s.calDayTextSelected);
            } else if (inRange) {
                btnStyle.push(s.calDayInRange);
                textStyle.push(s.calDayTextToday);
            } else if (isTodayDate) {
                btnStyle.push(s.calDayToday);
                textStyle.push(s.calDayTextToday);
            }

            days.push(
                <Pressable
                    key={`day-${day}`}
                    style={({ pressed }) => [
                        ...btnStyle,
                        pressed && !isSelected && { backgroundColor: "#f3f4f6" },
                        pressed && isSelected && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => handleDateClick(day)}
                >
                    <Text style={textStyle}>{day}</Text>
                </Pressable>
            );
        }

        // 3. Fill the remaining slots to make exactly 42 cells (keeps layout stable)
        const remainingSlots = totalSlots - days.length;
        for (let i = 0; i < remainingSlots; i++) {
            days.push(<View key={`empty-end-${i}`} style={s.calEmptyCell} />);
        }

        return days;
    };

    return (
        <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
            {/* Backdrop */}
            <Pressable style={s.modalBackdrop} onPress={onClose} />

            {/* Modal Content */}
            <View style={s.modalContainer}>
                <View style={s.modalContent}>
                    {/* Header */}
                    <View style={s.calHeader}>
                        <Text style={s.calTitle}>{title}</Text>
                        <Pressable onPress={onClose} style={s.calCloseBtn}>
                            <Ionicons name="close" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View style={s.calBody}>
                        {/* Month Navigation */}
                        <View style={s.calNav}>
                            <Pressable onPress={previousMonth} style={s.calNavBtn}>
                                <Ionicons name="chevron-back" size={20} color="#666" />
                            </Pressable>
                            <Text style={s.calMonthText}>
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </Text>
                            <Pressable onPress={nextMonth} style={s.calNavBtn}>
                                <Ionicons name="chevron-forward" size={20} color="#666" />
                            </Pressable>
                        </View>

                        {/* Day Names */}
                        <View style={s.calWeekRow}>
                            {dayNames.map((day) => (
                                <View key={day} style={s.calCell}>
                                    <Text style={s.calWeekText}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <View style={s.calGrid}>{renderCalendarDays()}</View>

                        {rangeMode && (
                            <Text style={s.calHint}>
                                {rangeStart && !rangeEnd
                                    ? "Now tap an end date for a range (or Done for a single day)"
                                    : "Tap a date, then tap another to select a range"}
                            </Text>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={s.calFooter}>
                        <Pressable style={s.calCancelBtn} onPress={onClose}>
                            <Text style={s.calCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={s.calDoneBtn}
                            onPress={() => {
                                if (rangeMode ? rangeStart : selectedDate) onClose();
                            }}
                        >
                            <Text style={s.calDoneText}>Done</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/* ========== STYLES ========== */
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#F9F7F4" },
    scroll: { flex: 1 },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: "#F9F7F4",
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    logoCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    logoImg: { width: 28, height: 28 },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    notifBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#2F6B4F",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#e5e7eb",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    profileImg: { width: 38, height: 38, borderRadius: 19 },

    // Greeting
    greetingSection: { marginBottom: 4 },
    dashLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#999",
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    greeting: {
        fontSize: 24,
        fontWeight: "700",
        color: "#333",
        marginBottom: 4,
    },
    greetingName: { color: "#2F6B4F" },
    companyName: {
        fontSize: 12,
        fontWeight: "500",
        color: "#999",
        letterSpacing: 0.5,
    },

    // Weekly Selector (header)
    weeklyRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 12,
    },
    weeklyBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    weeklyText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },

    // Period Dropdown
    periodDropdown: {
        position: "absolute",
        top: "100%",
        right: 0,
        zIndex: 999,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginTop: 6,
        overflow: "hidden",
        minWidth: 120,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    periodOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    periodOptionActive: { backgroundColor: "#2D5F3F" },
    periodOptionText: { fontSize: 14, fontWeight: "500", color: "#333" },

    // Custom date range
    customRangeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    customDateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        flex: 1,
    },
    customDateLabel: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },
    customDateValue: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginLeft: "auto" },

    // Metrics
    metricsRow: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 12,
    },
    metricCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        minWidth: 200,
    },
    metricIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
    },
    metricLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#6B7280",
        lineHeight: 20,
        marginBottom: 12,
    },
    metricBottom: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    metricValue: {
        fontSize: 32,
        fontWeight: "800",
        color: "#111827",
        lineHeight: 36,
        letterSpacing: -0.5,
    },
    trendBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    trendText: {
        fontSize: 13,
        fontWeight: "600",
    },

    // Filter Row
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
    },
    filterPeriodBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    filterPeriodText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    calendarBtn: {
        width: 44,
        height: 44,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    dateRangeBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    dateRangeText: { fontSize: 14, fontWeight: "600", color: "#333", flex: 1 },
    filterDateLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
    clearRangeBtn: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
        alignItems: "center",
    },

    // Categories
    catRow: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        gap: 8,
    },
    catBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    catBtnActive: { backgroundColor: "#2D5F3F", borderColor: "#2D5F3F" },
    catBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
    catBtnTextActive: { color: "#fff" },

    // Shift Section
    shiftSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    emptyBox: { alignItems: "center", paddingVertical: 40 },
    emptyText: { fontSize: 14, color: "#999", marginTop: 12 },

    // Shift Card
    shiftCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
    },
    shiftTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    personCol: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    personName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
        textAlign: "center",
    },
    personSub: {
        fontSize: 11,
        color: "#7A7A7A",
        textAlign: "center",
    },

    // Category Badge
    catBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    catBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    // Details Box
    detailsBox: {
        backgroundColor: "#F9F7F4",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: "#EAE6DF",
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: "500",
        color: "#999",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    detailValue: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
    detailTimeSub: { fontSize: 11, color: "#999", marginTop: 2 },
    divider: { height: 1, backgroundColor: "#EAE6DF", marginVertical: 10 },

    // Status
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: "700" },

    // Lock
    lockRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F9F7F4",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EAE6DF",
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 20,
    },
    lockText: { fontSize: 13, fontWeight: "500", color: "#333" },

    // Actions
    actionButtons: { flexDirection: "row", gap: 10, alignItems: "center" },
    viewReportBtn: {
        flex: 1,
        backgroundColor: "#2F6B4F",
        paddingVertical: 11,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    viewReportText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#2F6B4F",
        justifyContent: "center",
        alignItems: "center",
    },

    // Calendar Modal Styles
    modalBackdrop: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "90%",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    calHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    calTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
    calCloseBtn: { padding: 6, borderRadius: 20 },
    calBody: { padding: 20 },
    calNav: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    calNavBtn: { padding: 8, borderRadius: 20 },
    calMonthText: { fontSize: 16, fontWeight: "700", color: "#333" },
    calWeekRow: { flexDirection: "row", marginBottom: 8 },
    calCell: { flex: 1, height: 44, alignItems: "center", justifyContent: "center" },
    calWeekText: { fontSize: 12, fontWeight: "600", color: "#666" },
    calGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        width: "100%",
    },
    calDayBtn: {
        borderRadius: 8,
        width: "14.28%", // exactly 1/7th
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    calEmptyCell: {
        width: "14.28%",
        height: 44,
    },
    calDayText: { fontSize: 14, fontWeight: "500", color: "#333" },
    calDayToday: {
        backgroundColor: "rgba(45, 95, 63, 0.1)",
        borderWidth: 2,
        borderColor: "#2D5F3F",
    },
    calDayTextToday: { color: "#2D5F3F" },
    calDaySelected: {
        backgroundColor: "#2D5F3F",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    calDayTextSelected: { color: "#fff" },
    calDayInRange: { backgroundColor: "rgba(45, 95, 63, 0.12)" },
    calHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 12, fontWeight: "500" },
    calFooter: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
        gap: 12,
    },
    calCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: "#2D5F3F",
        borderRadius: 12,
        alignItems: "center",
    },
    calCancelText: { fontSize: 14, fontWeight: "600", color: "#2D5F3F" },
    calDoneBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: "#2D5F3F",
        borderRadius: 12,
        alignItems: "center",
    },
    calDoneText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
