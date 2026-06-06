import React from "react";
import { formatPhone } from "../utils/phoneHelper";

/**
 * Canadian phone input — formats as XXX-XXX-XXXX automatically.
 * Dashes are display-only; only 10 digits are stored/counted.
 *
 * Props: same as a standard <input>, plus optional `className` and `style`.
 * value / onChange behave like a controlled input.
 */
export default function PhoneInput({ value, onChange, className, style, placeholder, name, id, disabled, ...rest }) {
  const handleChange = (e) => {
    const formatted = formatPhone(e.target.value);
    // Synthesise a fake event so callers can use e.target.value as usual
    onChange && onChange({ ...e, target: { ...e.target, name: name || "", value: formatted } });
  };

  return (
    <input
      {...rest}
      type="tel"
      inputMode="numeric"
      id={id}
      name={name}
      value={formatPhone(value || "")}
      onChange={handleChange}
      placeholder={placeholder || "XXX-XXX-XXXX"}
      maxLength={12}          // 10 digits + 2 dashes
      disabled={disabled}
      className={className}
      style={style}
    />
  );
}
