import imgRectangle from "figma:asset/1af2086220affecd5f498aeca93f64918a91bf86.png";
import imgImage161 from "figma:asset/0d495a4b0b39eba28a6b72e320f92e9a00760e61.png";

export default function Frame({ className }: { className?: string }) {
  return (
    <div className={className || "bg-[#1d5f33] content-stretch flex gap-[10px] h-[387px] items-center overflow-clip relative rounded-[6px] w-[301px]"}>
      <div className="bg-[#0a361a] h-[387px] shrink-0 w-[301px]" />
      <div className="absolute bg-white h-[370px] left-[-18px] rounded-[301px] top-[144px] w-[337px]" />
      <div className="absolute left-[105px] size-[91px] top-[98px]">
        <div className="-translate-y-1/2 absolute aspect-[1024/1024] left-0 pointer-events-none right-0 rounded-[64px] top-1/2" data-name="Rectangle">
          <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[64px] size-full" src={imgRectangle} />
          <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-0 rounded-[64px]" />
        </div>
      </div>
      <div className="absolute content-stretch flex flex-col gap-[4px] items-center left-[98px] top-[64px]">
        <p className="font-['Roboto:Medium',sans-serif] font-medium leading-[24px] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
          Employee ID 27
        </p>
      </div>
      <div className="absolute content-stretch flex flex-col items-start left-[48px] top-[351px] w-[205px]">
        <div className="bg-[#e6e6e6] h-0 shrink-0 w-full" />
        <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[16px] relative shrink-0 text-[#2b3232] text-[12px] text-center tracking-[0.024px] w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
          From Humanity to Community
        </p>
      </div>
      <div className="-translate-x-1/2 absolute content-stretch flex gap-[10px] items-center left-1/2 top-[22px]">
        <div className="relative shrink-0 size-[32px]" data-name="image (16) 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage161} />
        </div>
        <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[28px] relative shrink-0 text-[20px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>{`Family Forever Inc. `}</p>
      </div>
      <p className="absolute font-['Roboto:Bold',sans-serif] font-bold leading-[24px] left-[95px] text-[#2b3232] text-[16px] top-[205px] tracking-[0.032px] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
        Adam Smasher
      </p>
      <p className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[24px] left-[74px] text-[#2b3232] text-[12px] top-[224px] tracking-[0.024px] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
        Child and Youth Care Worker
      </p>
      <p className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[24px] left-[calc(50%-79.5px)] text-[#2b3232] text-[12px] top-[276px] tracking-[0.024px] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
        adamsmasher89@gmail.com
      </p>
      <p className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[24px] left-[calc(50%-45.5px)] text-[#2b3232] text-[12px] top-[300px] tracking-[0.024px] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
        +1-376-345-3456
      </p>
    </div>
  );
}