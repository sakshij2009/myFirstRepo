import React, { useState } from "react";
import { ChevronLeft, Printer, Download, Users, Send, Save } from "lucide-react";

const fmtC = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const fmt2 = (v) => parseFloat(v || 0).toFixed(2);

const FF_INFO = {
  name: "Family Forever Inc.",
  tagline: "Child & Family Care Services",
  address: "206, 10110 124 Street Northwest",
  cityLine: "Edmonton, Alberta T5N 1P6, Canada",
  phone: "(780) 900-0000",
  email: "info@familyforever.ca",
  website: "www.familyforever.ca",
};

const GST_RATE = 0.05;

const typeColor = (t) => {
  const l = (t || "").toLowerCase();
  if (l.includes("emergent"))   return "#ef4444";
  if (l.includes("respite"))    return "#16a34a";
  if (l.includes("transport"))  return "#d97706";
  if (l.includes("supervised")) return "#9333ea";
  return "#3b82f6";
};

// Family Forever SVG logo mark (used as fallback if image fails to load)
function FFLogo({ size = 56 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: "#145228" }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="10" r="5" stroke="white" strokeWidth="2" />
        <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 14c2.5 1 4 3.5 4 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 14c-2.5 1-4 3.5-4 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function InvoiceGenerator({ agency, groups = [], preselectedClientId, dateRange, onBack }) {
  const [selectedClients, setSelectedClients] = useState({});
  const [logoError, setLogoError] = useState(false);

  React.useEffect(() => {
    const defaults = {};
    if (preselectedClientId) {
      defaults[preselectedClientId] = true;
    } else {
      groups.forEach(g => (defaults[g.id] = true));
    }
    setSelectedClients(defaults);
  }, [groups, preselectedClientId]);

  const toggleClient = (id) => setSelectedClients(p => ({ ...p, [id]: !p[id] }));
  const selectAll = () => { const s = {}; groups.forEach(g => (s[g.id] = true)); setSelectedClients(s); };
  const deselectAll = () => setSelectedClients({});

  const activeGroups = groups.filter(g => selectedClients[g.id]);

  // ── Invoice metadata ─────────────────────────────────────────────────────
  const invoiceYear = dateRange?.to ? new Date(dateRange.to + "T12:00:00").getFullYear() : new Date().getFullYear();
  const agencyCode  = (agency?.name || "AGCY").replace(/[^a-z0-9]/gi, "").substring(0, 4).toUpperCase();
  const invoiceSeq  = String(Math.floor(Math.random() * 900) + 100); // stable-ish
  const invoiceNumber = `FFI-${invoiceYear}-${agencyCode}-${invoiceSeq}`;

  const fmtDate = (iso) =>
    iso
      ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

  const issueDateStr = fmtDate(dateRange?.to);
  const dueDateStr   = dateRange?.to
    ? new Date(new Date(dateRange.to + "T12:00:00").getTime() + 15 * 86400000).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : fmtDate(null);

  const dateRangeLabel =
    dateRange?.from && dateRange?.to
      ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
      : "Current Period";

  // ── Per-group calculations ───────────────────────────────────────────────
  const groupSummaries = activeGroups.map(g => {
    const shifts = g.shifts.map(s => ({
      ...s,
      hours:           parseFloat(s.hours)           || 0,
      rate:            parseFloat(s.rate)             || 0,
      transportKm:     parseFloat(s.transportKm)     || 0,
      transportRate:   parseFloat(s.transportRate)   || 0,
      transportAmount: parseFloat(s.transportAmount) || 0,
    }));
    const serviceSubtotal  = shifts.reduce((a, s) => a + s.hours * s.rate, 0);
    const transportTotal   = shifts.reduce((a, s) => a + s.transportKm * s.transportRate, 0);
    const totalHours       = shifts.reduce((a, s) => a + s.hours, 0);
    return { ...g, shifts, serviceSubtotal, transportTotal, totalHours };
  });

  const grandService   = groupSummaries.reduce((a, g) => a + g.serviceSubtotal, 0);
  const grandTransport = groupSummaries.reduce((a, g) => a + g.transportTotal,  0);
  const grandExpenses  = 0;
  const preTax         = grandService + grandTransport + grandExpenses;
  const taxAmount      = grandService * GST_RATE;
  const totalDue       = preTax + taxAmount;
  const totalShifts    = groupSummaries.reduce((a, g) => a + g.shiftsCount, 0);
  const totalHoursAll  = groupSummaries.reduce((a, g) => a + g.totalHours, 0);
  const kmRate         = groupSummaries[0]?.shifts[0]?.transportRate || 0.60;

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[16px] font-extrabold text-gray-900 leading-tight">Per-Client Invoice Generation</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{invoiceNumber}</span>
              <span className="text-[11px] text-gray-400">•</span>
              <span className="text-[11px] text-gray-500 font-medium">{dateRangeLabel}</span>
              <span className="text-[11px] text-gray-400">•</span>
              <span className="text-[11px] text-gray-500 font-medium">{agency?.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-[12px] font-bold hover:bg-gray-50 transition-colors">
            <Printer size={14} /> Print
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-[12px] font-bold hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ── */}
        <div className="w-[270px] border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900">
              <Users size={15} className="text-gray-400" /> Clients
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                {activeGroups.length}/{groups.length}
              </span>
            </div>
            {activeGroups.length === groups.length
              ? <button onClick={deselectAll} className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors">Deselect All</button>
              : <button onClick={selectAll}   className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Select All</button>
            }
          </div>

          <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
            {groups.map(c => {
              const sel = !!selectedClients[c.id];
              return (
                <div key={c.id} onClick={() => toggleClient(c.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sel ? "border-emerald-200 bg-emerald-50/60 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                  {/* Checkbox */}
                  <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${sel ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                    {sel && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center shrink-0 transition-colors ${sel ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {(c.name || "U")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-extrabold text-gray-900 truncate leading-tight">{c.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{c.code}</p>
                    <p className="text-[11px] font-bold mt-1" style={{ color: sel ? "#16a34a" : "#9ca3af" }}>
                      {c.shiftsCount} shifts · {c.hours}h · {fmtC(c.grandTotal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar total footer */}
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400">{activeGroups.length} selected</span>
              <span className="text-[16px] font-black text-gray-900">{fmtC(totalDue)}</span>
            </div>
          </div>
        </div>

        {/* ── Invoice Document Area ── */}
        <div className="flex-1 overflow-auto bg-[#f0f2f5] p-8 flex justify-center">
          <div className="w-full max-w-[820px]">

            {/* WHITE INVOICE CARD */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>

              {/* ── Invoice header: Logo + Invoice # ── */}
              <div className="flex items-center justify-between px-10 pt-10 pb-7 border-b border-gray-100">
                {/* Logo */}
                <div className="flex items-center gap-3">
                  {!logoError ? (
                    <img
                      src="/images/logo.png"
                      alt="Family Forever"
                      className="h-14 w-14 object-contain rounded-full"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <FFLogo size={56} />
                  )}
                  <div>
                    <p className="font-black text-[17px] text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Family Forever</p>
                    <p className="text-[11px] text-gray-400 font-medium">Child Service Provider</p>
                  </div>
                </div>

                {/* Invoice # + Dates */}
                <div className="text-right">
                  <p className="text-[24px] font-black tracking-tight" style={{ color: "#145228" }}>{invoiceNumber}</p>
                  <div className="flex items-center gap-8 mt-2 justify-end">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Issue Date</p>
                      <p className="text-[13px] font-bold text-gray-900 mt-0.5">{issueDateStr}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Due Date</p>
                      <p className="text-[13px] font-bold text-red-500 mt-0.5">{dueDateStr}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bill From / Bill To ── */}
              <div className="grid grid-cols-2 gap-5 px-10 py-7 border-b border-gray-100">
                {/* Bill From */}
                <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Bill From</p>
                  <p className="font-black text-[14px] text-gray-900 mb-0.5">{FF_INFO.name}</p>
                  <p className="text-[11px] text-gray-500 mb-2">{FF_INFO.tagline}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                    {FF_INFO.address}<br />{FF_INFO.cityLine}
                  </p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-600">P:</span> {FF_INFO.phone}</p>
                    <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-600">E:</span> {FF_INFO.email}</p>
                    <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-600">W:</span> {FF_INFO.website}</p>
                  </div>
                </div>

                {/* Bill To */}
                <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Bill To</p>
                  <p className="font-black text-[14px] text-gray-900 mb-1">{agency?.name || "—"}</p>
                  {agency?.agencyType && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mb-2">
                      {agency.agencyType}
                    </span>
                  )}
                  {agency?.address && (
                    <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{agency.address}</p>
                  )}
                  {agency?.phone && (
                    <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-600">P:</span> {agency.phone}</p>
                  )}
                  {agency?.email && (
                    <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-600">E:</span> {agency.email}</p>
                  )}
                  {agency?.contactPerson && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      <span className="font-bold text-gray-600">Contact:</span> {agency.contactPerson}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Per-Client Sections ── */}
              {groupSummaries.length === 0 ? (
                <div className="px-10 py-12 text-center text-gray-400 text-sm">
                  No clients selected. Select clients from the sidebar.
                </div>
              ) : (
                groupSummaries.map((group, gi) => (
                  <div key={group.id} className={gi > 0 ? "border-t border-gray-100" : ""}>

                    {/* SERVICE RECIPIENT Banner */}
                    <div className="mx-10 mt-7 mb-5 px-5 py-4 rounded-2xl flex items-center justify-between"
                      style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center font-black text-white text-base">
                          {(group.name || "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Service Recipient</p>
                          <p className="text-[16px] font-black text-gray-900 leading-tight">{group.name}</p>
                          <p className="text-[10px] font-bold text-gray-400">{group.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Billing Period</p>
                        <p className="text-[12px] font-bold text-gray-700">{dateRangeLabel}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{group.shiftsCount} shifts · {group.totalHours.toFixed(1)}h total</p>
                      </div>
                    </div>

                    {/* Shifts Table */}
                    <div className="px-10 mb-6">
                      <table className="w-full" style={{ borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f0fdf4", borderBottom: "2px solid #bbf7d0" }}>
                            {["Date", "Service Type", "Staff", "Hours", "Rate", "Transport", "Amount"].map(h => (
                              <th key={h} className="text-left px-3 py-2.5"
                                style={{ fontSize: 9, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.shifts.map((s, si) => {
                            const amt  = s.hours * s.rate;
                            const tamt = s.transportKm * s.transportRate;
                            return (
                              <tr key={si} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td className="px-3 py-3.5" style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{s.date}</td>
                                <td className="px-3 py-3.5">
                                  <span style={{ fontSize: 12, fontWeight: 700, color: typeColor(s.type) }}>{s.type}</span>
                                </td>
                                <td className="px-3 py-3.5" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{s.staff}</td>
                                <td className="px-3 py-3.5" style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{s.hours}h</td>
                                <td className="px-3 py-3.5" style={{ fontSize: 11, color: "#6b7280" }}>{fmtC(s.rate)}/hr</td>
                                <td className="px-3 py-3.5">
                                  {tamt > 0 ? (
                                    <>
                                      <p style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>{fmtC(tamt)}</p>
                                      <p style={{ fontSize: 9, color: "#9ca3af" }}>{s.transportKm}km × ${fmt2(s.transportRate)}</p>
                                    </>
                                  ) : <span style={{ color: "#d1d5db" }}>—</span>}
                                </td>
                                <td className="px-3 py-3.5 text-right" style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>{fmtC(amt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                ))
              )}

              {/* ── Totals ── */}
              {groupSummaries.length > 0 && (
                <div className="px-10 pt-6 pb-8 border-t border-gray-100">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2.5 text-[12px]">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal ({totalShifts} shifts, {totalHoursAll.toFixed(1)}h)</span>
                        <span className="font-bold text-gray-900">{fmtC(grandService)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                          </svg>
                          Transportation
                          <span className="text-[10px] text-gray-400">@ ${fmt2(kmRate)}/km</span>
                        </span>
                        <span className="font-bold text-amber-600">{fmtC(grandTransport)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Additional Expenses</span>
                        <span className="font-bold text-gray-900">{fmtC(grandExpenses)}</span>
                      </div>

                      <div className="flex justify-between text-gray-800 font-bold pt-2.5 border-t border-gray-200">
                        <span>Pre-Tax Subtotal</span>
                        <span>{fmtC(preTax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="flex items-center gap-2">
                          Tax
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                            {(GST_RATE * 100).toFixed(1)}% GST
                          </span>
                        </span>
                        <span className="font-bold text-gray-700">{fmtC(taxAmount)}</span>
                      </div>

                      {/* TOTAL DUE */}
                      <div className="flex justify-between items-center px-5 py-4 rounded-2xl text-white font-black mt-3"
                        style={{ background: "linear-gradient(135deg,#145228,#1f7a3c)", fontSize: 15 }}>
                        <span>Total Due</span>
                        <span style={{ fontSize: 18 }}>{fmtC(totalDue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Payment Terms & Notes ── */}
              <div className="mx-10 mb-8 p-5 rounded-2xl text-[11px] text-gray-700"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <p className="font-black text-[12px] text-gray-800 mb-3">Payment Terms &amp; Notes</p>
                <ul className="space-y-1.5">
                  {[
                    <>Payment is due within <strong>15 days</strong> of invoice date.</>,
                    <>Late payments may be subject to a <strong>1.5% monthly interest</strong> charge.</>,
                    <>Please reference invoice number <strong>{invoiceNumber}</strong> in all correspondence.</>,
                    <>Transportation charges are billed at <strong>${fmt2(kmRate)} per kilometer</strong>.</>,
                    <>GST rate of <strong>{(GST_RATE * 100).toFixed(1)}%</strong> applied to service charges only.</>,
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span style={{ color: "#d97706", marginTop: 2 }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3" style={{ color: "#6b7280" }}>
                  Make checks payable to: <strong>Family Forever Inc.</strong>
                </p>
              </div>

              {/* ── Invoice Footer / Actions ── */}
              <div className="flex items-center justify-between px-10 py-5 border-t border-gray-100">
                <p style={{ fontSize: 10, color: "#9ca3af" }}>
                  Invoice generated for {activeGroups.length > 0 ? activeGroups.map(g => g.name).join(", ") : "—"}
                </p>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-[12px] font-bold hover:bg-gray-50 transition-colors">
                    <Save size={13} /> Save as Draft
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[12px] font-bold transition-all hover:opacity-90 shadow-md"
                    style={{ background: "#145228" }}>
                    <Send size={13} /> Send Invoice
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
