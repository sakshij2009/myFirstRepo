import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    collection,
    getDocs,
} from "firebase/firestore";
import { db } from "../../../src/firebase/config";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedPeriod, setSelectedPeriod] = useState("Weekly");
    const [showTopPeriodPicker, setShowTopPeriodPicker] = useState(false);
    const [showBottomPeriodPicker, setShowBottomPeriodPicker] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [shifts, setShifts] = useState([]);
    const [stats, setStats] = useState({
        totalClients: 0,
        totalTransport: 0,
        totalShifts: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalAgencies: 0,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const stored = await AsyncStorage.getItem("user");
                if (stored) setUser(JSON.parse(stored));
                await fetchDashboardData();
            } catch (err) {
                console.error("Dashboard load error:", err);
            }
        };
        load();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [clientSnap, shiftSnap, agencySnap] = await Promise.all([
                getDocs(collection(db, "clients")),
                getDocs(collection(db, "shifts")),
                getDocs(collection(db, "agencies")),
            ]);

            let transportCount = 0;
            shiftSnap.docs.forEach((doc) => {
                const d = doc.data();
                const cat = (d.shiftCategory || d.categoryName || "").toLowerCase();
                if (cat.includes("transport")) transportCount++;
            });

            setStats({
                totalClients: clientSnap.size,
                totalTransport: transportCount,
                totalShifts: shiftSnap.size,
                totalRevenue: 1200,
                totalExpenses: 1000,
                totalAgencies: agencySnap.size,
            });

            const allFetchedShifts = shiftSnap.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const da = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
                    const db2 = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
                    return db2 - da;
                });

            setShifts(allFetchedShifts);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        }
    };

    const metrics = [
        {
            icon: "people",
            label: "Total Clients",
            value: String(stats.totalClients),
            trend: "2.5%",
            up: true,
        },
        {
            icon: "car",
            label: "Total Transportation this Week",
            value: String(stats.totalTransport),
            trend: "2.5%",
            up: false,
        },
        {
            icon: "calendar",
            label: "Total Shift Completed",
            value: String(stats.totalShifts),
            trend: "2.5%",
            up: true,
        },
        {
            icon: "cash",
            label: "Total Revenue Generated",
            value: "$1,200",
            trend: "10.5%",
            up: true,
        },
        {
            icon: "cash-outline",
            label: "Total Expenses Made this week",
            value: "$1,000",
            trend: "5.5%",
            up: false,
        },
        {
            icon: "business",
            label: "New Agency Added",
            value: String(stats.totalAgencies).padStart(2, "0"),
            trend: "7.5%",
            up: true,
        },
        {
            icon: "book",
            label: "New Bootcamp Added",
            value: "01",
            trend: "1.0%",
            up: true,
        },
    ];

    const categories = [
        { id: "all", label: "All", color: "#2D5F3F" },
        { id: "respite", label: "Respite Care", color: "#4ECDC4" },
        { id: "emergency", label: "Emergent Care", color: "#FF4D6D" },
        { id: "visitation", label: "Supervised Visitation", color: "#FF9F1C" },
        { id: "transport", label: "Transportations", color: "#9D4EDD" },
    ];

    const periodOptions = ["Weekly", "Monthly", "Yearly"];

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

        // 2. Date filter
        let dateMatch = false;
        if (s.startDate) {
            const shiftDate = s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate);
            if (!isNaN(shiftDate)) {
                dateMatch = isSameDay(shiftDate, selectedDate);
            }
        }

        return categoryMatch && dateMatch;
    });

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
        if (!dateVal) return "";
        const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
        if (isNaN(d)) return "";
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
                                source={require("../../../assets/logo.png")}
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

                {/* ========== FILTER SECTION ========== */}
                <View style={[s.filterRow, { zIndex: 10 }]}>
                    <View style={{ position: "relative", zIndex: 10 }}>
                        <Pressable
                            style={s.filterPeriodBtn}
                            onPress={() => setShowBottomPeriodPicker(!showBottomPeriodPicker)}
                        >
                            <Text style={s.filterPeriodText}>{selectedPeriod}</Text>
                            <Ionicons name="chevron-down" size={16} color="#2D5F3F" />
                        </Pressable>

                        {/* Period Dropdown for bottom */}
                        {showBottomPeriodPicker && (
                            <View style={[s.periodDropdown, { left: 0 }]}>
                                {periodOptions.map((option) => (
                                    <Pressable
                                        key={option}
                                        style={[
                                            s.periodOption,
                                            selectedPeriod === option && s.periodOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedPeriod(option);
                                            setShowBottomPeriodPicker(false);
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

                    <Pressable style={s.calendarBtn} onPress={() => setIsCalendarOpen(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
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

            {/* Custom Calendar Modal */}
            <CalendarModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                title="Select Date"
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
                    <Text style={s.personSub}>CYIM: {staffId}</Text>
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
                    <View
                        style={[
                            s.statusBadge,
                            {
                                backgroundColor: shift.isCancelled
                                    ? "#FEE2E2"
                                    : shift.clockIn && shift.clockOut
                                        ? "#ECFDF5"
                                        : "#FEF3C7",
                            },
                        ]}
                    >
                        <Text
                            style={[
                                s.statusText,
                                {
                                    color: shift.isCancelled
                                        ? "#DC2626"
                                        : shift.clockIn && shift.clockOut
                                            ? "#059669"
                                            : "#D97706",
                                },
                            ]}
                        >
                            {shift.isCancelled
                                ? "Cancelled"
                                : shift.clockIn && shift.clockOut
                                    ? "Active • Confirmed"
                                    : "Upcoming"}
                        </Text>
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
                    onPress={() => router.push(`/admin/shift-report/${shift.id}/report`)}
                >
                    <Text style={s.viewReportText}>View Report</Text>
                </Pressable>
                <Pressable style={s.downloadBtn}>
                    <Ionicons name="download-outline" size={20} color="#2F6B4F" />
                </Pressable>
            </View>
        </View>
    );
}

/* ========== CALENDAR MODAL ========== */
function CalendarModal({ isOpen, onClose, selectedDate, onSelectDate, title = "Select Date" }) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

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

    const handleDateClick = (day) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        onSelectDate(newDate);
    };

    const isSelectedDate = (day) => {
        if (!selectedDate) return false;
        return (
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear()
        );
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

            let btnStyle = [s.calDayBtn]; // No longer applying s.calCell (which has flex: 1)
            let textStyle = [s.calDayText];

            if (isSelected) {
                btnStyle.push(s.calDaySelected);
                textStyle.push(s.calDayTextSelected);
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
                    </View>

                    {/* Footer */}
                    <View style={s.calFooter}>
                        <Pressable style={s.calCancelBtn} onPress={onClose}>
                            <Text style={s.calCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={s.calDoneBtn}
                            onPress={() => {
                                if (selectedDate) onClose();
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
    actionButtons: { flexDirection: "row", gap: 12 },
    viewReportBtn: {
        flex: 1,
        backgroundColor: "#2F6B4F",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    viewReportText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    downloadBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        borderWidth: 2,
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
