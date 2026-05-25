import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const UserCardBack = () => {
  return (
    <div className="w-full h-full bg-white rounded-xl border border-gray-300 flex flex-col justify-center items-center text-center p-6 shadow-lg">
      <h2 className="text-lg font-bold mb-3">Family Forever Inc.</h2>

      {/* QR Code */}
      <div className="mb-4">
        <QRCodeCanvas value="https://www.familyforever.ca" size={90} />
      </div>

      <h3 className="text-md font-semibold mb-2">Terms & Conditions</h3>

      <p className="text-sm text-gray-600 mb-4">
        Use of this card indicates agreement with Family Forever Inc’s policies
        and procedures.
      </p>

      <p className="text-sm text-gray-600 mb-4">
        This card is the property of Family Forever Inc. of Edmonton. If found,
        please call <br />
        <span className="font-semibold">825-982-3256 / 825-522-3256</span>
      </p>

      <p className="text-sm font-semibold text-gray-700 underline">
        www.familyforever.ca
      </p>
    </div>
  );
};

export default UserCardBack;
