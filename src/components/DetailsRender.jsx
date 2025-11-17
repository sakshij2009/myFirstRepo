const DetailsRenderer = ({ details }) => {
  if (!details) return null;

  return (
    <div className="flex flex-col gap-2 mt-3 border-t pt-3">
      {Object.entries(details).map(([label, value]) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          <span className="font-medium w-28">{label}:</span>
          <span className="text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
};

export default DetailsRenderer;
