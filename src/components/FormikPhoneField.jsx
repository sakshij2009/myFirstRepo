import React from "react";
import { useField } from "formik";
import { formatPhone } from "../utils/phoneHelper";

/**
 * Drop-in replacement for <Field> for Canadian phone numbers.
 * Auto-formats to XXX-XXX-XXXX as the user types.
 * Dashes are display-only — only 10 digits are stored.
 *
 * Usage (same as Formik <Field>):
 *   <FormikPhoneField name="phone" placeholder="XXX-XXX-XXXX" className={...} />
 */
export default function FormikPhoneField({ name, className, placeholder, disabled, style, ...rest }) {
  const [field, , helpers] = useField(name);

  const handleChange = (e) => {
    helpers.setValue(formatPhone(e.target.value));
  };

  const handleBlur = () => {
    helpers.setTouched(true);
  };

  return (
    <input
      {...rest}
      type="tel"
      inputMode="numeric"
      name={name}
      value={formatPhone(field.value || "")}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder || "XXX-XXX-XXXX"}
      maxLength={12}
      disabled={disabled}
      className={className}
      style={style}
    />
  );
}
