import React, { useState } from "react";
import { 
  ChevronLeft, Printer, Download, Link2, CheckCircle2, 
  MapPin, Phone, Mail, Building2, User, Users, Receipt
} from "lucide-react";

const fmtC = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

export default function InvoiceGenerator({ agency, groups = [], preselectedClientId, dateRange, onBack }) {
  const [selectedClients, setSelectedClients] = useState({});

  // Select defaults based on incoming action
  React.useEffect(() => {
    const defaultSec = {};
    if (preselectedClientId) {
      defaultSec[preselectedClientId] = true;
    } else {
      groups.forEach(g => defaultSec[g.id] = true);
    }
    setSelectedClients(defaultSec);
  }, [groups, preselectedClientId]);

  const toggleClient = (id) => {
    setSelectedClients(p => ({...p, [id]: !p[id]}));
  };

  const activeGroups = groups.filter(g => selectedClients[g.id]);
  
  // Flatten shifts
  const allShifts = activeGroups.flatMap(g => g.shifts.map(s => ({...s, clientName: g.name})));

  const totalAmount = allShifts.reduce((acc, s) => {
    const shiftTotal = (s.hours * s.rate) * 1.05; // 5% GST
    const transTotal = (s.transportKm * s.transportRate); // 0% GST
    return acc + shiftTotal + transTotal;
  }, 0);

  const issueDateStr = dateRange?.to ? new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : "Mar 31, 2026";
  const dueDateStr = dateRange?.to ? new Date(new Date(dateRange.to).getTime() + 15*86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : "Apr 15, 2026";

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative z-20" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[17px] font-extrabold text-gray-900 tracking-tight leading-tight mb-0.5">Per-Client Invoice Generation</h1>
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
              <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">FFI-UPCS-95</span>
              <span>• {agency?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-[12px] font-bold hover:bg-gray-50 transition-colors">
            <Printer size={14} /> Print
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-[12px] font-bold hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900">
              <Users size={16} className="text-gray-400" />
              Clients <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">{activeGroups.length}/{groups.length}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
            {groups.map(c => {
              const sel = selectedClients[c.id];
              return (
                <div key={c.id} onClick={() => toggleClient(c.id)} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${sel ? "border-emerald-100 bg-emerald-50/30" : "border-gray-100 bg-white hover:border-emerald-100"}`}>
                  <div className={`mt-1 flex items-center justify-center w-4 h-4 rounded-full border ${sel ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                    {sel && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <div className={`w-8 h-8 rounded-full ${sel ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"} font-bold text-sm flex items-center justify-center shrink-0`}>
                    {(c.name || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[13px] font-extrabold text-gray-900 leading-tight">{c.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400">{c.code}</p>
                    <p className="text-[11px] font-extrabold text-emerald-600 mt-1">{c.shiftsCount} shift{c.shiftsCount!==1?'s':''} · {c.hours}h · {fmtC(c.grandTotal)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice PDF View Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center pb-32">
          
          <div className="bg-white shadow-sm border border-gray-200 max-w-[850px] w-full p-12 relative" style={{ fontFamily: "Arial, sans-serif" }}>
            
            {/* Header Area */}
            <h1 className="text-center text-xl font-bold tracking-widest uppercase mb-10">Invoice</h1>

            <div className="flex justify-between items-start mb-16">
              
              <div className="text-[12px] text-black">
                <p className="font-bold mb-1 text-[13px]">Family Forever Inc.</p>
                <p>206, 10110 124 Street Northwest</p>
                <p>Edmonton, Alberta T5N 1P6</p>
                <p className="mb-6">Canada</p>

                <p className="font-bold text-[13px]">Bill To:</p>
                <p>{agency?.name || "Unlimited Potential Community Services"}</p>
                {agency?.address ? (
                  <>
                    <p>{agency.address.split(',')[0]} {agency.address.split(',')[1] || ""}</p>
                    <p>{agency.address.split(',').slice(2).join(',') || ""}</p>
                  </>
                ) : (
                  <>
                    <p>#145, 10403 172 Street NW</p>
                    <p>Edmonton, Alberta</p>
                    <p>T5S 1K9</p>
                  </>
                )}
              </div>

              <div className="flex flex-col items-end">
                {/* Logo Placeholder Match */}
                <div className="w-[120px] h-[120px] border-[3px] border-[#1f7a3c] rounded-full flex flex-col items-center justify-center mb-6 relative">
                  <div className="absolute w-full h-full text-[10px] font-bold text-[#1f7a3c] tracking-widest" style={{transform: "rotate(-45deg)"}}></div>
                  <Users size={40} className="text-[#1f7a3c]" strokeWidth={2.5} />
                  <p className="text-[10px] font-black text-[#1f7a3c] uppercase mt-2 tracking-widest text-center leading-tight">Family<br/>Forever</p>
                </div>

                <div className="text-[11px] text-black text-right space-y-1">
                  <p><span className="font-bold">Invoice Number:</span> FFI-{(agency?.name || "UPCS").replace(/[^a-z0-9]/gi, '').substring(0,4).toUpperCase()}-95</p>
                  <p><span className="font-bold">Invoice Date:</span> {issueDateStr}</p>
                  <p><span className="font-bold">Due Date:</span> {dueDateStr}</p>
                </div>
              </div>

            </div>

            {/* Shift Items Table */}
            <table className="w-full border-collapse border border-black mb-10 text-[11px]">
              <thead className="bg-[#c1e1c1]">
                <tr>
                  <th className="border border-black px-2 py-1 text-left font-bold w-6">#</th>
                  <th className="border border-black px-2 py-1 text-left font-bold"></th>
                  <th className="border border-black px-2 py-1 text-right font-bold w-12">Qty</th>
                  <th className="border border-black px-2 py-1 text-right font-bold w-16">Rate</th>
                  <th className="border border-black px-2 py-1 text-right font-bold w-16">GST Rate</th>
                  <th className="border border-black px-2 py-1 text-right font-bold w-16">GST</th>
                  <th className="border border-black px-2 py-1 text-right font-bold w-20">Amount</th>
                </tr>
              </thead>
              <tbody>
                {allShifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-black px-2 py-4 text-center italic text-gray-500">No shifts selected or found in this date range.</td>
                  </tr>
                ) : null}
                {allShifts.map((s, idx) => {
                  const shiftTotal = s.hours * s.rate;
                  const shiftGst = shiftTotal * 0.05;
                  const transTotal = s.transportKm * s.transportRate;
                  
                  return (
                    <React.Fragment key={idx}>
                      {/* Hours Row */}
                      <tr>
                        <td className="border border-black px-2 py-2 text-center align-top border-r">{idx*2 + 1}</td>
                        <td className="border-t border-black px-2 py-2 border-r">{s.date} {s.type} for {s.clientName}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">{s.hours}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">$ {(s.rate || 0).toFixed(2)}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">5.00%</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">$ {shiftGst.toFixed(2)}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">{(shiftTotal + shiftGst).toFixed(2)}</td>
                      </tr>
                      {/* Mileage Row */}
                      <tr>
                        <td className="border border-black px-2 py-2 text-center align-top border-r">{idx*2 + 2}</td>
                        <td className="border-t border-black px-2 py-2 border-r">{s.date} {s.type} Milage for {s.clientName}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">{s.transportKm}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">$ {(s.transportRate || 0).toFixed(2)}</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">0.00%</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">$ -</td>
                        <td className="border-t border-black px-2 py-2 text-right border-r">{(transTotal).toFixed(2)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Final Total Section */}
            <div className="flex justify-end pr-2 text-[12px] font-bold">
              <div className="flex items-center gap-8">
                <span>INVOICE TOTAL</span>
                <span className="border-b-2 border-black pb-0.5">$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
