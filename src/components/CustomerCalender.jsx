import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export default function CustomCalendar({
  selectedDates = [],
  onDatesChange,
  selectionMode = "multiple",
  onClose,
}) {
  const getAlbertaToday = () => {
    const now = new Date();
    const albertaStr = now.toLocaleDateString("en-CA", { timeZone: "America/Edmonton" });
    const [y, m, d] = albertaStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const albertaToday = getAlbertaToday();

  const [internalMode, setInternalMode] = useState(
    selectionMode === "single" ? "single" : selectionMode === "range" ? "range" : "multiple"
  );

  // For range mode we store { from, to }; for others we store Date | Date[]
  const [tempDates, setTempDates] = useState(
    selectedDates.length ? selectedDates : [albertaToday]
  );

  useEffect(() => {
    setTempDates(selectedDates.length ? selectedDates : [getAlbertaToday()]);
  }, [selectedDates]);

  // Expand a { from, to } range into every date in between
  const expandRange = (range) => {
    if (!range?.from) return [];
    if (!range.to) return [range.from];
    const dates = [];
    const cur = new Date(range.from);
    while (cur <= range.to) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleDone = () => {
    if (onDatesChange) {
      if (!tempDates) {
        onDatesChange([]);
      } else if (internalMode === "range") {
        // Convert { from, to } to flat array
        onDatesChange(expandRange(tempDates));
      } else if (Array.isArray(tempDates)) {
        onDatesChange(tempDates);
      } else {
        onDatesChange([tempDates]);
      }
    }
    if (onClose) onClose();
  };

  const handleCancel = () => {
    setTempDates(selectedDates.length ? selectedDates : [getAlbertaToday()]);
    if (onClose) onClose();
  };

  const handleSelect = (dates) => {
    if (!dates) {
      setTempDates(internalMode === "range" ? {} : []);
      return;
    }
    setTempDates(dates);
  };

  const modeLabel = {
    single: "Select Date",
    multiple: "Select Dates",
    range: "Select Date Range",
  };

  // Helper to switch modes cleanly
  const switchMode = (mode) => {
    setInternalMode(mode);
    if (mode === "single") {
      // Keep first selected date
      const first = Array.isArray(tempDates) ? tempDates[0] : tempDates?.from ?? tempDates;
      setTempDates(first || albertaToday);
    } else if (mode === "multiple") {
      // Convert single / range to array
      if (Array.isArray(tempDates)) {
        setTempDates(tempDates);
      } else if (tempDates?.from) {
        setTempDates(expandRange(tempDates));
      } else {
        setTempDates([tempDates].filter(Boolean));
      }
    } else if (mode === "range") {
      // Convert to { from, to }
      if (Array.isArray(tempDates) && tempDates.length > 0) {
        setTempDates({ from: tempDates[0], to: tempDates[tempDates.length - 1] });
      } else if (tempDates && !Array.isArray(tempDates)) {
        setTempDates({ from: tempDates, to: undefined });
      } else {
        setTempDates({ from: albertaToday, to: undefined });
      }
    }
  };

  const btnBase = "px-3 py-1 text-xs font-semibold transition-colors";
  const btnActive = "bg-dark-green text-white";
  const btnInactive = "bg-white text-dark-green hover:bg-green-50";

  return (
    <div className="bg-white p-5 rounded-md shadow-lg min-w-[360px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-light-black">
          {modeLabel[internalMode]}
        </h2>

        {/* Three-way Mode Toggle: Single | Multiple | Range */}
        <div className="flex border border-dark-green rounded overflow-hidden">
          <button
            type="button"
            onClick={() => switchMode("single")}
            className={`${btnBase} ${internalMode === "single" ? btnActive : btnInactive}`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => switchMode("multiple")}
            className={`${btnBase} border-l border-dark-green ${internalMode === "multiple" ? btnActive : btnInactive}`}
          >
            Multiple
          </button>
          <button
            type="button"
            onClick={() => switchMode("range")}
            className={`${btnBase} border-l border-dark-green ${internalMode === "range" ? btnActive : btnInactive}`}
          >
            Range
          </button>
        </div>
      </div>

      <div className="flex justify-center flex-col items-center">
        <DayPicker
          mode={internalMode}
          selected={tempDates}
          onSelect={handleSelect}
          className="custom-daypicker-green"
          defaultMonth={
            Array.isArray(tempDates) && tempDates.length > 0
              ? tempDates[0]
              : tempDates?.from ?? tempDates ?? albertaToday
          }
        />
      </div>

      {/* Range hint */}
      {internalMode === "range" && (
        <p className="text-xs text-gray-400 text-center -mt-2 mb-2">
          Click a start date, then an end date
        </p>
      )}

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleCancel}
          className="px-4 py-1 border border-gray-400 rounded text-sm text-gray-600 hover:bg-gray-50"
          type="button"
        >
          Cancel
        </button>

        <button
          onClick={handleDone}
          className="px-4 py-1 bg-dark-green text-white rounded text-sm hover:opacity-90"
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
}

