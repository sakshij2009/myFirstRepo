import React, { useEffect, useRef } from "react";

const GoogleAddressInput = ({ value, onChange, onLocationSelect, placeholder }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["geocode"],
        componentRestrictions: { country: "ca" }
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      const formatted = place.formatted_address || "";
      const location = place.geometry?.location;

      onChange(formatted);

      if (location) {
        onLocationSelect({
          lat: location.lat(),
          lng: location.lng(),
        });
      }
    });
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-light-gray rounded-sm p-[10px]"
    />
  );
};

export default GoogleAddressInput;
