import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, ChevronDown } from "lucide-react";

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function sameDay(a, b) {
  return a && b &&
    a.getDate()     === b.getDate()     &&
    a.getMonth()    === b.getMonth()    &&
    a.getFullYear() === b.getFullYear();
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isBetween(d, start, end) {
  if (!start || !end) return false;
  const t = d.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return t > s && t < e;
}

function buildGrid(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevTotal   = new Date(year, month, 0).getDate();
  const grid = [];
  for (let i = firstDay - 1; i >= 0; i--)
    grid.push({ day: prevTotal - i, current: false, date: new Date(year, month - 1, prevTotal - i) });
  for (let d = 1; d <= daysInMonth; d++)
    grid.push({ day: d, current: true, date: new Date(year, month, d) });
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++)
    grid.push({ day: d, current: false, date: new Date(year, month + 1, d) });
  return grid;
}

// Generate year range: 10 years back, 10 years forward
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 21 }, (_, i) => CURRENT_YEAR - 10 + i);

function Dropdown({ value, options, onChange, renderLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected item into view when dropdown opens
  const listRef = useRef(null);
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector("[data-selected='true']");
    if (selected) selected.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: open ? "#f0fdf4" : "#fff",
          cursor: "pointer",
          fontSize: 14, fontWeight: 800,
          color: open ? "#145228" : "#111827",
          transition: "all 0.12s",
        }}
      >
        {renderLabel ? renderLabel(value) : value}
        <ChevronDown size={12} strokeWidth={2.5} style={{
          color: "#9ca3af",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
        }} />
      </button>

      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: "50%",
            transform: "translateX(-50%)",
            background: "#fff", borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 10, maxHeight: 200, overflowY: "auto",
            minWidth: 130, padding: "4px 0",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                data-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "center",
                  padding: "7px 14px", fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#145228" : "#374151",
                  background: isSelected ? "#f0fdf4" : "transparent",
                  border: "none", cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseOut={(e)  => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MiniCalendar({ selectedDates, onDatesChange, onClose }) {
  const today   = startOfDay(new Date());
  const initial = selectedDates?.[0] || today;

  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [rangeStart, setRangeStart] = useState(selectedDates?.[0] || null);
  const [rangeEnd,   setRangeEnd]   = useState(selectedDates?.[selectedDates.length - 1] || null);
  const [hovering,   setHovering]   = useState(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthOptions = MONTHS.map((m, i) => ({ value: i, label: m }));
  const yearOptions  = YEARS.map(y => ({ value: y, label: String(y) }));

  const handleDayClick = (date) => {
    const d = startOfDay(date);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(d); setRangeEnd(null);
    } else {
      if (sameDay(d, rangeStart)) setRangeEnd(null);
      else setRangeEnd(d);
    }
  };

  const handleDone = () => {
    if (!rangeStart) { onDatesChange([]); onClose(); return; }
    if (!rangeEnd || sameDay(rangeStart, rangeEnd)) {
      onDatesChange([rangeStart]);
    } else {
      const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const end   = rangeStart < rangeEnd ? rangeEnd   : rangeStart;
      const dates = [];
      let cur = new Date(start);
      while (cur <= end) { dates.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      onDatesChange(dates);
    }
    onClose();
  };

  const effectiveEnd = rangeEnd || (rangeStart && hovering ? hovering : null);
  const grid = buildGrid(viewYear, viewMonth);
  const isRangeActive = rangeStart && effectiveEnd && !sameDay(rangeStart, effectiveEnd);

  return (
    /* ── Backdrop ──────────────────────────────────────────────────────────── */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* ── Calendar card ─────────────────────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 340,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          overflow: "hidden",
          animation: "calPop 0.18s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`
          @keyframes calPop {
            from { opacity: 0; transform: scale(0.93); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid #f3f4f6",
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
              Select Date
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {rangeStart && rangeEnd && !sameDay(rangeStart, rangeEnd)
                ? "Range selected"
                : rangeStart
                ? "Click another date for range"
                : "Pick a date or range"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Selected pill */}
            {rangeStart && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: "#145228",
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 20, padding: "3px 10px",
              }}>
                {rangeEnd && !sameDay(rangeStart, rangeEnd)
                  ? `${rangeStart.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} – ${rangeEnd.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}`
                  : rangeStart.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#6b7280",
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Month / Year nav ────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px 6px",
        }}>
          <button onClick={prevMonth} style={{
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff",
            cursor: "pointer", color: "#374151",
          }}>
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>

          {/* Dropdowns */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Dropdown
              value={viewMonth}
              options={monthOptions}
              onChange={(v) => setViewMonth(v)}
              renderLabel={(v) => (
                <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{MONTHS[v]}</span>
              )}
            />
            <Dropdown
              value={viewYear}
              options={yearOptions}
              onChange={(v) => setViewYear(v)}
              renderLabel={(v) => (
                <span style={{
                  fontSize: 13, fontWeight: 700, color: "#fff",
                  background: "#145228", borderRadius: 6, padding: "1px 8px",
                }}>{v}</span>
              )}
            />
          </div>

          <button onClick={nextMonth} style={{
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff",
            cursor: "pointer", color: "#374151",
          }}>
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Day headers ─────────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7,1fr)",
          padding: "8px 14px 4px", gap: 2,
        }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: "center", fontSize: 10, fontWeight: 700,
              color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em",
              paddingBottom: 4,
            }}>{d}</div>
          ))}
        </div>

        {/* ── Day grid ────────────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7,1fr)",
          padding: "0 14px 14px", gap: 2,
        }}>
          {grid.map(({ day, current, date }, i) => {
            const isToday    = sameDay(date, today);
            const isStart    = rangeStart && sameDay(date, rangeStart);
            const isEnd      = effectiveEnd && sameDay(date, effectiveEnd);
            const isSelected = isStart || isEnd;
            const inRange    = isRangeActive && isBetween(date, rangeStart, effectiveEnd);
            const isRangeS   = isRangeActive && isStart;
            const isRangeE   = isRangeActive && isEnd;

            // Background strip for range
            let stripBg = "transparent";
            if (inRange) stripBg = "#dcfce7";
            if (isRangeS) stripBg = "linear-gradient(to right, transparent 50%, #dcfce7 50%)";
            if (isRangeE) stripBg = "linear-gradient(to left, transparent 50%, #dcfce7 50%)";

            const dotColor = isSelected ? "#fff" : inRange ? "#1f7a3c" : current ? "#111827" : "#d1d5db";

            return (
              <div key={i} style={{ position: "relative", background: stripBg }}>
                <button
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={() => { if (rangeStart && !rangeEnd) setHovering(startOfDay(date)); }}
                  onMouseLeave={() => setHovering(null)}
                  style={{
                    width: "100%", aspectRatio: "1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12.5, fontWeight: isSelected ? 800 : inRange ? 600 : 500,
                    color: dotColor,
                    background: isSelected ? "#145228" : "transparent",
                    borderRadius: "50%",
                    border: isToday && !isSelected ? "2px solid #1f7a3c" : "2px solid transparent",
                    cursor: "pointer",
                    outline: "none",
                    transition: "background 0.12s, transform 0.08s",
                    position: "relative",
                    zIndex: 1,
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#f0fdf4";
                      e.currentTarget.style.transform = "scale(1.1)";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = isSelected ? "#145228" : "transparent";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 18px 16px",
          borderTop: "1px solid #f3f4f6",
        }}>
          <button
            onClick={() => { setRangeStart(null); setRangeEnd(null); }}
            style={{
              fontSize: 12, fontWeight: 600, color: "#9ca3af",
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 4px",
            }}
          >
            Clear
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { onDatesChange(selectedDates || []); onClose(); }}
              style={{
                fontSize: 12.5, fontWeight: 600, color: "#374151",
                padding: "8px 18px", borderRadius: 10,
                border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              style={{
                fontSize: 12.5, fontWeight: 700, color: "#fff",
                padding: "8px 22px", borderRadius: 10,
                border: "none", background: "#145228", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(20,82,40,0.25)",
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
