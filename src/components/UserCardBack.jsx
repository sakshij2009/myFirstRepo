import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const SITE_URL = "https://www.familyforever.ca";

const UserCardBack = () => {
  return (
    <div className="w-full h-full bg-white rounded-xl border-2 border-dashed border-purple-400 flex flex-col justify-center items-center text-center p-6 shadow-lg">
      <h2 className="text-lg font-bold mb-4">Family Forever Inc.</h2>

      {/* QR Code — clicking opens the website */}
      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mb-4 block"
        title="Open Family Forever website"
      >
        <QRCodeCanvas value={SITE_URL} size={100} />
      </a>

      <h3 className="text-base font-semibold mb-2">Terms &amp; Conditions</h3>

      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
        Use of this card indicates agreement with Family Forever Inc's. Policies
        and procedures. This Card is the property of Family Forever Inc. of
        Edmonton, if found please call{" "}
        <span className="font-semibold">825-982-3256/ 825-522-3256</span>
      </p>

      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-sm font-semibold text-gray-700 underline hover:text-dark-green"
      >
        www.familyforever.ca
      </a>
    </div>
  );
};

export default UserCardBack;
