import { useEffect, useRef, useState } from "react";
import { parseTimeInput, to12HourClock } from "../utils/timeHelpers";

/**
 * 12-hour time entry field.
 *
 * The admin types and reads 12-hour ("9:00 AM"), but `onChange` always emits
 * the canonical 24-hour "HH:mm" string that the rest of the system stores.
 * That matters: shift start/end times are compared lexicographically for
 * overnight + conflict detection, and UserDashboard builds its clock-in value
 * as `${date}, ${startTime}:00` — both of which only work on "HH:mm".
 *
 * Entry is forgiving: "9", "9pm", "9:30 pm", "930", "2130" and "21:30" all
 * resolve. The field re-writes itself to the canonical 12-hour display on blur.
 *
 * Props:
 *   value       – canonical "HH:mm" (also accepts "h:mm AM/PM" from old records)
 *   onChange    – (canonicalHHmm: string) => void
 *   onBlur, placeholder, className, style, disabled – forwarded
 */
export default function TimeInput12({
  value,
  onChange,
  onBlur,
  placeholder = "e.g. 9:00 AM",
  className,
  style,
  disabled,
  name,
}) {
  const [draft, setDraft] = useState(() => to12HourClock(value));
  const focused = useRef(false);

  // Keep the visible text in sync when the value changes from the outside
  // (autofill from a client record, form reset, …) — but never yank the text
  // out from under someone who is mid-type.
  useEffect(() => {
    if (!focused.current) setDraft(to12HourClock(value));
  }, [value]);

  const commit = (raw) => {
    const canonical = parseTimeInput(raw);
    if (canonical === null) return false;      // unparseable — leave the draft alone
    onChange(canonical);
    setDraft(to12HourClock(canonical));
    return true;
  };

  return (
    <input
      type="text"
      name={name}
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      style={style}
      autoComplete="off"
      inputMode="numeric"
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        // Emit as soon as the text is unambiguous so validation and the
        // conflict/overnight checks stay live while typing.
        const canonical = parseTimeInput(raw);
        if (canonical !== null) onChange(canonical);
      }}
      onBlur={(e) => {
        focused.current = false;
        if (!commit(e.target.value)) {
          // Unparseable and non-empty: keep what was typed so the field's
          // validation message can explain the problem.
          if (!e.target.value.trim()) onChange("");
        }
        onBlur?.(e);
      }}
    />
  );
}
