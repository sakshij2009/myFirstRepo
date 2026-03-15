const AppToggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className="relative inline-flex items-center cursor-pointer shrink-0 transition-colors duration-200"
    style={{
      width: 32, height: 18, borderRadius: 9,
      background: checked ? "#1B5E37" : "#D1D5DB",
      border: "none", padding: 0,
    }}
  >
    <span
      className="absolute transition-transform duration-200"
      style={{
        width: 12, height: 12, borderRadius: "50%", background: "#FFFFFF",
        top: 3, left: checked ? 17 : 3,
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }}
    />
  </button>
);

export default AppToggle;
