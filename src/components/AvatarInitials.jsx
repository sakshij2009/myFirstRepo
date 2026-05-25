const AvatarWithInitials = ({ fullName }) => {
  // Split the name and extract initials
  const parts = fullName.trim().split(" ");
  const initials =
    (parts[0]?.[0] || "").toUpperCase() +
    (parts[1]?.[0] || "").toUpperCase();

  return (
    <div className="flex items-center gap-1">
      {/* Circle Initials Avatar */}
      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
        <span className="font-semibold text-gray-700 text-[10px]">{initials}</span>
      </div>

      {/* Name */}
      <span className="font-medium text-[10px]">{fullName}</span>
    </div>
  );
};

export default AvatarWithInitials;
