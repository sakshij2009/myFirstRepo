import html2pdf from "html2pdf.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayName = (idx) => DAY_NAMES[idx] ?? idx;

const escapeHtml = (val) => {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

// Renders a labeled field. Empty values print as a blank underline so the
// same template also works as a fillable blank form (hand it out on paper).
const field = (label, value) => {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  const display = empty
    ? `<span style="display:inline-block;min-width:170px;border-bottom:1px solid #999;">&nbsp;</span>`
    : `<span style="color:#111827;">${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</span>`;
  return `<p style="font-size:12.5px;margin:4px 0;color:#374151;page-break-inside:avoid;"><b>${escapeHtml(label)}:</b> ${display}</p>`;
};

const sectionTitle = (title) => `
  <div style="margin:20px 0 10px 0;page-break-after:avoid;">
    <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px 0;">${escapeHtml(title)}</p>
    <div style="height:3px;width:34px;background:#145228;border-radius:2px;"></div>
  </div>
`;

const col = (html) => `<div style="flex:1 1 45%;min-width:220px;">${html}</div>`;
const row = (cols) => `<div style="display:flex;flex-wrap:wrap;gap:0 24px;page-break-inside:avoid;">${cols.join("")}</div>`;

const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
  return years >= 0 ? years : null;
};

const buildIntakeFormContent = (values = {}, { isCaseWorker = false, serviceNames = [] } = {}) => {
  const clients = Array.isArray(values.clients) ? values.clients : [];
  const parentInfoList = Array.isArray(values.parentInfoList) ? values.parentInfoList : [];
  const medicalInfoList = Array.isArray(values.medicalInfoList) ? values.medicalInfoList : [];
  const transportationInfoList = Array.isArray(values.transportationInfoList) ? values.transportationInfoList : [];
  const supervisedVisitations = Array.isArray(values.supervisedVisitations) ? values.supervisedVisitations : [];
  const caseworkers = Array.isArray(values.caseworkers) ? values.caseworkers : [];
  const billingInfoList = Array.isArray(values.billingInfoList) ? values.billingInfoList : [];

  let html = `
    <div style="font-family: Arial, Helvetica, sans-serif; padding: 40px 45px; color:#111827;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;gap:16px;align-items:center;">
          <img src="/images/Logo2.png" style="width:65px;height:65px;" />
          <div>
            <p style="margin:0;font-size:20px;font-weight:700;color:#2E7D32;letter-spacing:1px;">FAMILY FOREVER INC</p>
            <p style="margin:2px 0 0 0;font-size:12px;font-weight:600;color:#2E7D32;letter-spacing:0.5px;">FROM HUMANITY TO COMMUNITY</p>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#C97B1A;">Intake Form</p>
          <p style="margin:2px 0 0 0;font-size:11px;color:#6b7280;">${escapeHtml(isCaseWorker ? "Intake Worker Submission" : "Owner Submission")}</p>
        </div>
      </div>
      <hr style="margin:18px 0;border:none;border-top:1.5px solid #ccc;" />
  `;

  if (isCaseWorker) {
    html += sectionTitle("Intake Worker Information");
    html += row([
      col(field("Name", values.intakeworkerName)),
      col(field("Agency / Organisation", values.agencyName)),
      col(field("Phone Number", values.intakeworkerPhone)),
      col(field("Email", values.intakeworkerEmail)),
    ]);

    html += sectionTitle("Case Worker Information (CFS)");
    (caseworkers.length ? caseworkers : [{}]).forEach((cw, i) => {
      if (i > 0) html += `<p style="font-size:11.5px;font-weight:700;color:#6b7280;margin:12px 0 4px 0;">Additional Case Worker ${i + 1}</p>`;
      html += row([
        col(field("Name", cw.name)),
        col(field("Agency / Organisation", cw.agency)),
        col(field("Phone Number", cw.phone)),
        col(field("Email", cw.email)),
      ]);
    });
  }

  html += sectionTitle("Family Name");
  html += field("Family Name", values.familyName);

  html += sectionTitle("Services");
  html += row([
    col(field("Types of Services", serviceNames)),
    col(field("Service Dates", values.services?.serviceDates)),
  ]);
  if ((values.services?.transportationDays || []).length) {
    html += field("Transportation Days", (values.services.transportationDays || []).map(dayName));
  }
  if ((values.services?.supervisedVisitationDays || []).length) {
    html += field("Supervised Visitation Days", (values.services.supervisedVisitationDays || []).map(dayName));
  }
  html += field("Safety Plan / Management Risk", values.services?.safetyPlan);
  html += field("Service Description", values.services?.serviceDesc);

  html += sectionTitle("Client Info");
  (clients.length ? clients : [{}]).forEach((c, i) => {
    if (clients.length > 1) {
      html += `<p style="font-size:12px;font-weight:700;color:#145228;margin:14px 0 4px 0;">Client ${i + 1}</p>`;
    }
    const age = calcAge(c.birthDate);
    html += row([
      col(field("Full Name", c.fullName)),
      col(field("Gender", c.gender)),
      col(field("Date of Birth", c.birthDate ? `${c.birthDate}${age != null ? ` (Age ${age})` : ""}` : "")),
      col(field("Phone (Guardian)", c.phone)),
      col(field("Email", c.email)),
      col(field("Service Start Date", c.startDate)),
      col(field("Address", c.address)),
      col(field("Apartment / Unit No.", c.apartmentUnit)),
      col(field("CFS Status", c.cfsStatus)),
      col(field("CYIM ID / Number", c.cyimId)),
      col(field("DFNA Number", c.dfnaNumber)),
      col(field("Treaty #", c.treatyNumber)),
    ]);
    html += field("Client Info", c.clientInfo);
    if ((c.photos || []).length) html += field("Photos Attached", `${c.photos.length} file(s)`);
  });

  html += sectionTitle("Parents / Guardians Info");
  (parentInfoList.length ? parentInfoList : [{}]).forEach((p) => {
    html += row([
      col(field("Client Name", p.clientName)),
      col(field("Parent / Guardian Name", p.parentName)),
      col(field("Relationship", p.relationShip)),
      col(field("Phone", p.parentPhone)),
      col(field("Email", p.parentEmail)),
      col(field("Address", p.parentAddress)),
    ]);
  });

  html += sectionTitle("Billing Info");
  (billingInfoList.length ? billingInfoList : [{}]).forEach((b) => {
    html += field("Invoice Email", b.invoiceEmail);
  });

  html += sectionTitle("Medical Info");
  (medicalInfoList.length ? medicalInfoList : [{}]).forEach((m) => {
    html += row([
      col(field("Client Name", m.clientName)),
      col(field("Health Care No.", m.healthCareNo)),
      col(field("Diagnosis", m.diagnosis)),
      col(field("Diagnosis Type", m.diagnosisType)),
      col(field("Mobility Assistance", m.mobilityAssistance)),
      col(field("Mobility Info", m.mobilityInfo)),
      col(field("Communication Aid", m.communicationAid)),
      col(field("Communication Info", m.communicationInfo)),
    ]);
    html += field("Medical Concern", m.medicalConcern);
    if ((m.marDocs || []).length) html += field("MAR Sheet Attached", `${m.marDocs.length} file(s)`);
  });

  // Which of the transportation / visitation sections to print is driven by
  // the selected service types — same logic the on-screen form uses to decide
  // which cards to show — not by whether the fields already have values.
  // Otherwise a freshly selected (still-blank) section would never print,
  // and a section for a service that isn't selected could print by mistake.
  const lower = (s) => (s || "").toLowerCase();
  const showCombinedSection = serviceNames.some((n) => {
    const l = lower(n);
    return (l.includes("supervised") || l.includes("visitation")) && l.includes("transport");
  });
  const showTransportSection = !showCombinedSection && serviceNames.some((n) => lower(n).includes("transport"));
  const showVisitSection = !showCombinedSection && serviceNames.some((n) => {
    const l = lower(n);
    return l.includes("supervised") || l.includes("visitation");
  });

  if (showCombinedSection) {
    html += sectionTitle("Supervised Visitation & Transportation Info");
    const count = Math.max(transportationInfoList.length, supervisedVisitations.length, 1);
    for (let i = 0; i < count; i++) {
      const t = transportationInfoList[i] || {};
      const v = supervisedVisitations[i] || {};
      if (count > 1) html += `<p style="font-size:12px;font-weight:700;color:#145228;margin:14px 0 4px 0;">Combined Info ${i + 1}</p>`;
      html += field("Client Name", t.clientName || v.clientName);
      html += row([
        col(field("Pickup Address", t.pickupAddress)),
        col(field("Dropoff Address", t.dropoffAddress)),
        col(field("Pickup Time", t.pickupTime)),
        col(field("Dropoff Time", t.dropOffTime)),
        col(field("Car Seat Required", t.carSeatRequired)),
        col(field("Car Seat Type", t.carSeatType)),
      ]);
      html += field("Transportation Overview", t.transportationOverview);
      html += row([
        col(field("Visit Start Time", v.visitStartTime)),
        col(field("Visit End Time", v.visitEndTime)),
        col(field("Visit Duration", v.visitDuration)),
        col(field("Purpose of Visit", v.visitPurpose)),
        col(field("Visit Address", v.visitAddress)),
      ]);
      html += field("Visit Overview", v.visitOverview);
    }
  } else {
    if (showTransportSection) {
      html += sectionTitle("Transportation Info");
      (transportationInfoList.length ? transportationInfoList : [{}]).forEach((t, i) => {
        if (transportationInfoList.length > 1) html += `<p style="font-size:12px;font-weight:700;color:#145228;margin:14px 0 4px 0;">Transportation ${i + 1}</p>`;
        html += row([
          col(field("Client Name", t.clientName)),
          col(field("Pickup Address", t.pickupAddress)),
          col(field("Dropoff Address", t.dropoffAddress)),
          col(field("Pickup Time", t.pickupTime)),
          col(field("Dropoff Time", t.dropOffTime)),
          col(field("Car Seat Required", t.carSeatRequired)),
          col(field("Car Seat Type", t.carSeatType)),
        ]);
        html += field("Transportation Overview", t.transportationOverview);
      });
    }

    if (showVisitSection) {
      html += sectionTitle("Supervised Visitations");
      (supervisedVisitations.length ? supervisedVisitations : [{}]).forEach((v, i) => {
        if (supervisedVisitations.length > 1) html += `<p style="font-size:12px;font-weight:700;color:#145228;margin:14px 0 4px 0;">Visitation ${i + 1}</p>`;
        html += row([
          col(field("Client Name", v.clientName)),
          col(field("Visit Start Time", v.visitStartTime)),
          col(field("Visit End Time", v.visitEndTime)),
          col(field("Visit Duration", v.visitDuration)),
          col(field("Purpose of Visit", v.visitPurpose)),
          col(field("Visit Address", v.visitAddress)),
        ]);
        html += field("Visit Overview", v.visitOverview);
      });
    }
  }

  if ((values.uploadDocs || []).length) {
    html += sectionTitle("Uploaded Documents");
    html += field("Documents Attached", `${values.uploadDocs.length} file(s)`);
  }

  html += sectionTitle("Acknowledgement");
  html += row([
    col(field(isCaseWorker ? "Worker Name" : "Parent / Guardian Name", values.workerInfo?.workerName)),
    col(field("Date", values.workerInfo?.date)),
  ]);
  html += `<p style="font-size:12.5px;margin:12px 0 4px 0;color:#374151;"><b>${isCaseWorker ? "Worker" : "Parent / Guardian"} Signature:</b></p>`;
  html += values.workerInfo?.signature
    ? `<p style="font-family:'Dancing Script',cursive;font-size:30px;color:#1e3a8a;margin:2px 0 0 0;">${escapeHtml(values.workerInfo.signature)}</p>`
    : `<div style="border:1px dashed #999;height:60px;width:260px;margin-top:4px;"></div>`;

  html += `</div>`;
  return html;
};

const buildOpt = (filenameBase) => ({
  margin: [50, 10, 10, 10],
  filename: `Intake_Form_${filenameBase}.pdf`,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
  pagebreak: { mode: ["css", "legacy"] },
});

const applyWatermark = (pdf) => {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Large centered logo watermark — same treatment as the shift report PDF.
    pdf.setGState(pdf.GState({ opacity: 0.15 }));
    const logoSize = 350;
    pdf.addImage(
      "/images/Logo2.png",
      "PNG",
      cx - logoSize / 2,
      cy - logoSize / 2,
      logoSize,
      logoSize
    );

    pdf.setGState(pdf.GState({ opacity: 1 }));
  }
};

const safeFilenamePart = (values) => {
  const base = values.familyName || values.clients?.[0]?.fullName || "Form";
  return String(base).replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60) || "Form";
};

// Builds the watermarked intake-form PDF (works for both a filled-in
// submission and a blank form — empty fields render as a blank line) and
// opens the browser's print dialog directly via a hidden iframe.
export const printIntakeFormPDF = (values, meta = {}) => {
  const filenameBase = safeFilenamePart(values);
  return html2pdf()
    .from(buildIntakeFormContent(values, meta))
    .set(buildOpt(filenameBase))
    .toPdf()
    .get("pdf")
    .then((pdf) => {
      applyWatermark(pdf);
      const blobUrl = pdf.output("bloburl");

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = blobUrl;

      const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      };

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (err) {
            console.error("Print failed:", err);
          }
        }, 300);
      };

      document.body.appendChild(iframe);
      // Best-effort cleanup — the print dialog is modal in most browsers so
      // this fires once the user closes/completes it; fall back to a timer.
      window.addEventListener("focus", cleanup, { once: true });
      setTimeout(cleanup, 60000);
    });
};

// Downloads the same watermarked PDF instead of printing directly.
export const downloadIntakeFormPDF = (values, meta = {}) => {
  const filenameBase = safeFilenamePart(values);
  html2pdf()
    .from(buildIntakeFormContent(values, meta))
    .set(buildOpt(filenameBase))
    .toPdf()
    .get("pdf")
    .then(applyWatermark)
    .save();
};
