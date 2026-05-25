import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function FilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-all hover:border-gray-300 font-medium bg-white"
        style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#374151" }}
      >
        <span className="text-gray-500">{label}:</span>
        <span>{value}</span>
        <ChevronDown className="size-3.5" strokeWidth={2.5} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 min-w-[140px]">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              style={{
                color: value === opt ? "#1f7a3c" : "#374151",
                fontWeight: value === opt ? 600 : 400,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
