import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { IoChevronDown } from "react-icons/io5";

const sameDay = (a, b) => a.toDateString() === b.toDateString();
const sameMonth = (a, b) =>
  a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getDatesBetween = (a, b) => {
  const start = startOfDay(a) <= startOfDay(b) ? startOfDay(a) : startOfDay(b);
  const end = startOfDay(a) <= startOfDay(b) ? startOfDay(b) : startOfDay(a);
  const dates = [];
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const isBetween = (date, start, end) => {
  const d = startOfDay(date).getTime();
  return d > startOfDay(start).getTime() && d < startOfDay(end).getTime();
};

function CustomDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-white text-black rounded-md px-2 py-1 flex items-center focus:outline-none border-0"
      >
        {options[value]}
        <span className="ml-2 text-green-600">
          <IoChevronDown />
        </span>
      </button>
      {open && (
        <ul className="absolute mt-1 bg-white rounded-md z-10 max-h-60 overflow-y-auto border-0">
          {options.map((opt, idx) => (
            <li
              key={idx}
              onClick={() => {
                onChange(idx);
                setOpen(false);
              }}
              className="px-3 py-1 text-black cursor-pointer hover:bg-green-100 rounded-md"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomYearDropdown({ years, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-white text-black rounded-md px-2 py-1 flex items-center focus:outline-none border-0"
      >
        {value}
        <span className="ml-2 text-green-600">
          <IoChevronDown />
        </span>
      </button>
      {open && (
        <ul className="absolute mt-1 bg-white rounded-md z-10 max-h-60 overflow-y-auto border-0">
          {years.map((year) => (
            <li
              key={year}
              onClick={() => {
                onChange(year);
                setOpen(false);
              }}
              className="px-3 py-1 text-black cursor-pointer hover:bg-green-100 rounded-md"
            >
              {year}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Props:
 * - selectedDates: Date[]
 * - onDatesChange: (Date[]) => void
 * - selectionMode: "single" | "multiple" (default "multiple")
 * - onClose: () => void
 */
export default function CustomCalendar({
  selectedDates = [],
  onDatesChange,
  selectionMode = "multiple",
  onClose,
}) {
  const [tempDates, setTempDates] = useState(
    selectedDates.length ? selectedDates : [new Date()] // default to today
  );
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  useEffect(() => {
    setTempDates(selectedDates);
  }, [selectedDates]);

  const handleDateClick = (date) => {
  setTempDates((prev) => {
    const today = startOfDay(new Date());

    if (!prev || prev.length === 0) {
      return [date];
    }

    const exists = prev.some((d) => sameDay(d, date));

    if (exists) {
      // If clicking the first or last date
      const first = prev[0];
      const last = prev[prev.length - 1];

      if (sameDay(date, first)) {
        return [last]; // shrink to last
      }
      if (sameDay(date, last)) {
        return [first]; // shrink to first
      }
      // If middle date clicked → just shrink to that single date
      return [date];
    }

    if (prev.length === 1) {
      // If only one selected, create range
      return getDatesBetween(prev[0], date);
    }

    // Already a range
    const first = prev[0];
    const last = prev[prev.length - 1];

    if (date < first) {
      // Extend backwards
      return getDatesBetween(date, last);
    } else if (date > last) {
      // Extend forwards
      return getDatesBetween(first, date);
    } else {
      // Inside range → decide which side to keep
      const distToFirst = Math.abs(date - first);
      const distToLast = Math.abs(date - last);

      if (distToFirst < distToLast) {
        // Closer to start → make [date..last]
        return getDatesBetween(date, last);
      } else {
        // Closer to end → make [first..date]
        return getDatesBetween(first, date);
      }
    }
  });
};



  const handleDone = () => {
    onDatesChange?.(tempDates);
    onClose?.();
  };

  const handleCancel = () => {
    setTempDates(selectedDates);
    onClose?.();
  };

  const today = startOfDay(new Date());

const isHighlighted = (date) => {
  if (!tempDates || tempDates.length === 0) {
    return sameDay(date, today);
  }
  return tempDates.some((d) => sameDay(d, date));
};


  const monthNames = useMemo(
    () => [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ],
    []
  );

  return (
    <DatePicker
      inline
      selected={tempDates[0] || null}
      onChange={(date) => handleDateClick(date)}
      dayClassName={(date) => {
        const inView = sameMonth(date, currentViewDate);

        

        if (selectionMode === "multiple" && tempDates.length > 1) {
          const min = tempDates.reduce((a, b) => (a < b ? a : b));
          const max = tempDates.reduce((a, b) => (a > b ? a : b));

          if (sameDay(date, min) || sameDay(date, max)) {
            return "!bg-green-600 !text-white !font-medium !rounded-full";
          }
          if (isBetween(date, min, max)) {
            return "!bg-green-200 !text-green-700 !rounded-full";
          }
        }

        if (isHighlighted(date) ) {
          return "!bg-green-600 !text-white !font-medium !rounded-full";
        }

        if (!inView) {
          return "!text-gray-400";
        }
        return undefined;
      }}
      calendarClassName="!bg-white !p-2 !rounded-lg [&_.react-datepicker__header]:!bg-white [&_.react-datepicker__header]:!border-0"
      renderCustomHeader={({ date, decreaseMonth, increaseMonth, changeMonth, changeYear }) => {
        if (!sameMonth(date, currentViewDate)) {
          setTimeout(() => setCurrentViewDate(date), 0);
        }
        return (
          <div className="flex justify-between items-center px-2 py-1 text-black bg-white">
            <button type="button" onClick={decreaseMonth} className="text-green-600 font-bold">
              {"<"}
            </button>
            <div className="flex items-center">
              <CustomDropdown
                options={monthNames}
                value={date.getMonth()}
                onChange={(val) => changeMonth(val)}
              />
              <CustomYearDropdown
                years={Array.from({ length: 20 }, (_, i) => 2015 + i)}
                value={date.getFullYear()}
                onChange={(val) => changeYear(val)}
              />
            </div>
            <button type="button" onClick={increaseMonth} className="text-green-600 font-bold">
              {">"}
            </button>
          </div>
        );
      }}
    >
      <div className="flex justify-end px-1 py-2 bg-white">
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-[6px] text-green-600 font-medium text-sm leading-5 tracking-normal"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="px-3 py-[6px] bg-green-600 text-white rounded font-medium text-sm leading-5 tracking-normal ml-2"
        >
          Done
        </button>
      </div>
    </DatePicker>
  );
}
