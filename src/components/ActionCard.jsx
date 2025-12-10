import React from "react";

const ActionCard = ({ onClick,title, description, buttonText, onlyUseWhen,color  }) => {
  const colorMap = {
    red: {
      border: "border-[#FFC9C9]",
      bg: "bg-[#FEF2F2]",
      text: "text-[#CD0007]",
      button: "bg-red-600 hover:bg-red-700",
      label: "text-[#E7000B]",
      iconBg: "bg-red-100",
      img:"/images/jam_triangle-danger.png",
      heading:"text-[#82181A]"
    },
    blue: {
      border: "border-blue-400",
      bg: "bg-blue-50",
      text: "text-[#4177FC]",
      button: "bg-blue-600 hover:bg-blue-700",
      label: "text-[#1447E8]",
      iconBg: "bg-blue-100",
      img:"/images/jam_triangle-contact.png",
      heading:"text-[#193CB8]"
    },
    orange: {
      border: "border-orange-400",
      bg: "bg-orange-50",
      text: "text-[#F54A00]",
      button: "bg-orange-500 hover:bg-orange-600",
      label: "text-[#CA3526]",
      iconBg: "bg-orange-100",
      img:"/images/jam_triangle-notes.png",
      heading:"text-[#9F2D26]"
    },
    green: {
      border: "border-green-400",
      bg: "bg-green-50",
      text: "text-[#00A67E]",
      button: "bg-green-600 hover:bg-green-700",
      label: "text-[#00825B]",
      iconBg: "bg-green-100",
      img:"/images/jam_triangle-follow.png",
      heading:"text-[#016630]"
    },
  };

  const c = colorMap[color];

  return (
    <div className={`border ${c.border} ${c.bg} rounded p-4 flex flex-col gap-2`}>
      <div className="flex  items-center gap-4">
        <div className="flex items-center gap-2">
          <img src={`${c.img}`} alt="" />  
        </div>
        <div className="flex justify-between w-full">
            <div className="flex flex-col">
                 <h3 className={`${c.heading} font-semibold text-sm leading-5`}>
              {title}
            </h3>
            <p className={`text-sm ${c.text}`}>{description}</p>
            </div>
           
           <div className="flex">
                <div
                 onClick={onClick}
                className={`${c.button} cursor-pointer flex gap-[10px]  text-white px-4 py-[10px] rounded-md text-[16px] font-medium leading-[24px] w-[229px] justify-center`}
                >
                <div className="flex items-center"><img src="/images/important.png" alt="" /></div>
                <div className="flex items-center ">{buttonText}</div>
                </div>
            </div>
        </div>

        
      </div>
      <div className="flex items-center gap-1">
        <p className={`font-bold ${c.label} text-[14px] leading-[24px]`}>Only Use When: </p>
          <p className={` ${c.label} text-[14px] leading-[20px] items-center `}>{onlyUseWhen}</p>

      </div>
    </div>
  );
};

export default ActionCard;
