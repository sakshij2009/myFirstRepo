import React from 'react';

const UserCardBack = () => {
  return (
    <div className=" rounded-xl bg-[linear-gradient(138.15deg,_#0DBB85_0%,_#395A69_97.38%)] text-white flex flex-col justify-center items-center p-6 text-center shadow-lg border border-white/20 w-[374px] h-[270px]">
      <h2 className="text-sm font-semibold mb-2 tracking-wide">Family Forever INC</h2>

      <h3 className="text-lg font-bold mb-3">Terms & Conditions</h3>

      <p className="text-sm leading-relaxed mb-4 text-white/90">
        Use of this card indicates agreement with Family Forever Inc’s policies and procedures.
      </p>

      <p className="text-sm leading-relaxed mb-6 text-white/90">
        This card is the property of Family Forever Inc. of Edmonton, if found please call
        <br />
        <span className="font-semibold text-white">825-522-3256</span>
      </p>

      <p className="text-sm font-semibold underline text-white/90">
        WWW.FamilyForever.ca
      </p>
    </div>
  );
};

export default UserCardBack;
