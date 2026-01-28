import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Props:
 *  - shifts: array of shift docs (must contain startDate like "10-May-2025" or "07 Mar 2025")
 *  - selectedDate: Date
 *  - onSelectDate: (date: Date) => void
 *  - accentColor?: string (default green)
 */
export default function MonthlyCalendar({
  shifts = [],
  selectedDate,
  onSelectDate,
  accentColor = "#1f5f3b",
}) {
  // show month based on selectedDate (like screenshot)
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  useEffect(() => {
    // if selectedDate changes (external), keep month in sync
    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const monthLabel = viewMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  }).toUpperCase();

  const daysWithShifts = useMemo(() => {
    // Set of day numbers in the currently viewed month that have shifts
    const set = new Set();
    shifts.forEach((s) => {
      const d = parseShiftDateLoose(s?.startDate);
      if (!d) return;
      if (
        d.getFullYear() === viewMonth.getFullYear() &&
        d.getMonth() === viewMonth.getMonth()
      ) {
        set.add(d.getDate());
      }
    });
    return set;
  }, [shifts, viewMonth]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const goPrevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isSameDay = (d1, d2) =>
    d1 &&
    d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  return (
    <View style={styles.card}>
      {/* Header row: arrows + month */}
      <View style={styles.monthHeader}>
        <Pressable onPress={goPrevMonth} hitSlop={10} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={22} color="#111827" />
        </Pressable>

        <Text style={styles.monthText}>{monthLabel}</Text>

        <Pressable onPress={goNextMonth} hitSlop={10} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#111827" />
        </Pressable>
      </View>

      {/* Days grid (7 columns) */}
      <View style={styles.grid}>
        {grid.map((cell, idx) => {
          if (!cell) return <View key={idx} style={styles.dayCell} />;

          const selected = isSameDay(cell, selectedDate);
          const hasShift = daysWithShifts.has(cell.getDate());

          return (
            <Pressable
              key={idx}
              onPress={() => onSelectDate?.(cell)}
              style={[
                styles.dayCell,
                selected && { backgroundColor: "#EAF3EE" },
              ]}
            >
              {/* green dot like screenshot */}
            <View
  style={[
    styles.dayCircle,
    hasShift && { backgroundColor: "#1f5f3b" },
    selected && {
      backgroundColor: "#CFE8D7",
      borderWidth: 1,
      borderColor: "#8FC6A5",
    },
  ]}
>
  <Text
    style={[
      styles.dayText,
      hasShift && { color: "#fff" },
      selected && !hasShift && { color: "#0F172A", fontWeight: "900" },
    ]}
  >
    {cell.getDate()}
  </Text>
</View>



              
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ================= helpers ================= */

// Supports: "10-May-2025" AND "07 Mar 2025"
function parseShiftDateLoose(str) {
  if (!str) return null;

  // Try "10-May-2025"
  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) {
      const [dd, mmm, yyyy] = parts;
      const d = Number(dd);
      const y = Number(yyyy);
      const monthIndex = monthFromName(mmm);
      if (!Number.isNaN(d) && monthIndex >= 0 && !Number.isNaN(y)) {
        return new Date(y, monthIndex, d);
      }
    }
  }

  // Try "07 Mar 2025"
  if (str.includes(" ")) {
    const [dd, mmm, yyyy] = str.split(" ");
    const d = Number(dd);
    const y = Number(yyyy);
    const monthIndex = monthFromName(mmm);
    if (!Number.isNaN(d) && monthIndex >= 0 && !Number.isNaN(y)) {
      return new Date(y, monthIndex, d);
    }
  }

  return null;
}

function monthFromName(m) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mm = (m || "").slice(0, 3);
  return months.indexOf(mm);
}

function buildMonthGrid(firstOfMonth) {
  const year = firstOfMonth.getFullYear();
  const month = firstOfMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Make Monday-start like many UIs? Screenshot looks like Monday-start (1 under Monday).
  // We'll do Monday-start:
  // JS getDay(): Sun=0..Sat=6
  // Convert to Mon=0..Sun=6
  const leadingBlanks = (firstDay.getDay() + 6) % 7;

  const totalDays = lastDay.getDate();
  const cells = [];

  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));

  // pad to full weeks (optional, keeps neat)
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/* ================= styles ================= */

const styles = {
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: {
    fontWeight: "800",
    fontSize: 13,
    color: "#111827",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
 dayCell: {
  width: `${100 / 7}%`,
  paddingVertical: 10,
  alignItems: "center",
},

dayCircle: {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: "center",
  justifyContent: "center",
},

dayText: {
  fontSize: 13,
  color: "#111827",
  fontWeight: "700",
},

  dayText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
};
