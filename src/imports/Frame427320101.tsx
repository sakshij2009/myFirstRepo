// QR placeholder — no figma:asset import needed
function QRBox() {
  const cell = 9; const size = 91;
  const filled = [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,0],[1,6],[2,0],[2,2],[2,3],[2,4],[2,6],[3,0],[3,2],[3,3],[3,4],[3,6],[4,0],[4,2],[4,4],[4,6],[5,0],[5,6],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[8,1],[8,3],[8,5],[7,8],[8,8],[9,9]];
  return (<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{filled.map(([r,c],i)=><rect key={i} x={c*cell} y={r*cell} width={cell-1} height={cell-1} fill="#1A1A1A" rx={1}/>)}</svg>);
}

export default function Frame({ className }: { className?: string }) {
  return (
    <div className={className || "bg-white content-stretch flex flex-col h-[387px] items-center px-[24px] py-[32px] relative rounded-[6px] w-[301px]"}>
      <div className="content-stretch flex flex-col gap-[71px] h-[335px] items-center relative shrink-0 w-full">
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-h-px min-w-px relative w-full">
          <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0">
            <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[28px] relative shrink-0 text-[#2b3232] text-[20px] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>{`Family Forever Inc. `}</p>
            <div className="relative shrink-0 size-[91px]" data-name="image 47">
              <QRBox />
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