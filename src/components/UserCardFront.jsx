import React from "react";

const UserCardFront = ({ user }) => {
  return (
    <div className=" max-w-sm bg-[linear-gradient(138.15deg,_#0DBB85_0%,_#395A69_97.38%)]  text-white rounded-[6px]  p-4 flex flex-col items-center text-center border border-[#5BEABA] gap-4 w-[374px] h-[270px]">
      
      {/* Organization Name */}
      <h2 className="text-sm md:text-base font-bold leading-4 ">Family Forever INC</h2>
      
      {/* Profile Image */}
      <div className="flex gap-4 items-center">
        <div className="flex w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md mb-4">
        <img
          src={user.profilePhotoUrl}
          alt={name}
          className="w-full h-full object-cover object-center"
        />
      </div>
      <div className="flex flex-col ">
        <h3 className="text-lg md:text-xl font-bold">{user.name}</h3>
        <p className="text-sm md:text-base opacity-90">Child and Youth Care Worker</p>
      </div>

      </div>
      

     

      {/* Employee ID */}
      <div className="mt-4 mb-4 bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-sm font-medium">
        Employee ID: <span className="font-bold text-white">{user.userId}</span>
      </div>

      {/* Tagline */}
      <p className="text-xs md:text-sm font-medium opacity-90">From Humanity to Community</p>
    </div>
  );
};

export default UserCardFront;
