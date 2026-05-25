import imgImage47 from "figma:asset/72e4462f590042cd762853a816e000ce1895aaad.png";

export default function Frame({ className }: { className?: string }) {
  return (
    <div className={className || "bg-white content-stretch flex flex-col h-[387px] items-center px-[24px] py-[32px] relative rounded-[6px] w-[301px]"}>
      <div className="content-stretch flex flex-col gap-[71px] h-[335px] items-center relative shrink-0 w-full">
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-h-px min-w-px relative w-full">
          <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0">
            <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[28px] relative shrink-0 text-[#2b3232] text-[20px] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>{`Family Forever Inc. `}</p>
            <div className="relative shrink-0 size-[91px]" data-name="image 47">
              <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage47} />
            </div>
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-start min-h-px min-w-px relative text-[#2b3232] text-center w-full">
            <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[24px] relative shrink-0 text-[16px] w-full" style={{ fontVariationSettings: "'wdth' 100" }}>{`Terms & Conditions`}</p>
            <div className="font-['Roboto:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[12px] w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
              <p className="leading-[20px] mb-0">Use of this card indicates agreement with</p>
              <p className="leading-[20px] mb-0">Family Forever Inc’s. Policies and procedures.</p>
              <p className="leading-[20px] mb-0">This Card is the property of Family Forever</p>
              <p>
                <span className="leading-[20px]">{`Inc. of Edmonton, if found please call `}</span>
                <span className="font-['Roboto:Medium',sans-serif] font-medium leading-[20px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  825-982-3256/ 825-522-3256
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
          <div className="bg-[#e6e6e6] h-0 shrink-0 w-full" />
          <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[16px] relative shrink-0 text-[#2b3232] text-[12px] text-center tracking-[0.024px] w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
            www.familyforever.ca
          </p>
        </div>
      </div>
    </div>
  );
}