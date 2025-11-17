// src/components/inputs.jsx
import React from "react";

const base =
  "block w-full rounded border border-light-gray p-[10px] text-sm text-gray-900 placeholder-gray-400  outline-none focus:border-black ";
const label = "mb-1 block text-sm font-bold text-[14px] leading-[20px] ";
const help = "mt-1 text-xs text-red-600";

export function Field({ id, labelText, children, error }) {
  return (
    <div>
      {labelText && (
        <label htmlFor={id} className={label}>
          {labelText}
        </label>
      )}
      {children}
      {error ? <p className={help}>{error}</p> : null}
    </div>
  );
}

export function TextInput(props) {
  return <input className={base} {...props} />;
}

export function TextArea(props) {
  return <textarea className={base} rows={props.rows ?? 4} {...props} />;
}

export function Select(props) {
  return <select className={base} {...props} />;
}

export function Check({ labelText, ...props }) {
  return (
    <label className="flex items-center gap-2 text-[16px] font-normal text-gray-800">
      <input type="checkbox" className="h-4 w-4 text-emerald-600" {...props} />
      <span>{labelText}</span>
    </label>
  );
}

export function Radio({ name, value, checked, onChange, labelText }) {
  return (
    <label className="flex items-center gap-3 text-sm text-gray-800">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 text-emerald-600"
      />
      <span>{labelText}</span>
    </label>
  );
}

export const classes = { base, label, help };
