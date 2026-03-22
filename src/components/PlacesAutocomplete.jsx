import { useEffect, useRef } from "react";

/**
 * Reusable Google Places Autocomplete input.
 * Requires the Maps JS API with &libraries=places to be loaded (already in index.html).
 *
 * Props:
 *   value      – controlled string value
 *   onChange   – (string) => void
 *   placeholder, className, style – forwarded to <input>
 */
export default function PlacesAutocomplete({ value, onChange, placeholder, className, style, disabled }) {
  const inputRef = useRef(null);
  const acRef    = useRef(null);

  useEffect(() => {
    let intervalId = null;

    const init = () => {
      if (!inputRef.current || acRef.current) return;
      if (!window.google?.maps?.places) return;

      acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["address"],
      });

      acRef.current.addListener("place_changed", () => {
        const place = acRef.current.getPlace();
        if (place?.formatted_address) onChange(place.formatted_address);
      });
    };

    if (window.google?.maps?.places) {
      init();
    } else {
      intervalId = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(intervalId);
          init();
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (acRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={style}
      autoComplete="off"
      disabled={disabled}
    />
  );
}
