import React from "react";

const InfoNotificationCard = ({ notif, onMarkRead, onViewDetails }) => {
  return (
    <div
      className={`border rounded-xl p-4 shadow-sm transition-all ${
        notif.read ? "bg-gray-50" : "bg-blue-50"
      }`}
    >
      <h3 className="font-semibold text-lg">{notif.title}</h3>
      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>

      {/* Related info section */}
      <div className="text-sm mt-2 space-y-1">
        {notif.relatedData?.date && (
          <p>
            <b>Date:</b> {notif.relatedData.date}
          </p>
        )}
        {notif.relatedData?.shiftType && (
          <p>
            <b>Shift Type:</b>{" "}
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
              {notif.relatedData.shiftType}
            </span>
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => onMarkRead(notif.id)}
          className="px-3 py-1 border rounded-md text-gray-700 hover:bg-gray-100"
        >
          Mark as Read
        </button>
        <button
          onClick={() => onViewDetails(notif.relatedData?.shiftId)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default InfoNotificationCard;
