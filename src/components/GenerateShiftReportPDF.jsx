import html2pdf from "html2pdf.js";

export const formatTime = (value) => {
  if (!value) return "N/A";
  const s = String(value).trim();

  // Already a formatted "HH:MM AM/PM" string (stored by mobile app) — return as-is
  if (/AM|PM/i.test(s) && s.match(/^\d{1,2}:\d{2}/)) return s.toUpperCase();

  const d = new Date(s);
  if (isNaN(d.getTime())) return s || "N/A";

  return d.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Edmonton",
  });
};

export const calculateTotalHours = (start, end) => {
  if (!start || !end) return "N/A";

  const s = parseFloat(start);
  const e = parseFloat(end);

  if (isNaN(s) || isNaN(e)) return "N/A";

  if (e >= s) return (e - s).toFixed(2);

  return ((24 - s) + e).toFixed(2);
};

// Build the shared HTML content for the report (used for both download & share)
const buildReportContent = (shift) => {
  const totalHoursCalculated = calculateTotalHours(shift.startTime, shift.endTime);

  return `
    <div style="font-family: Arial; padding: 30px 35px; ">
      <div style="display: flex; gap: 24px; align-items: center;">
        <img src="/images/Logo2.png" style="width: 60px; height: 60px; display: flex;" />
        <div>
          <h1 style="margin: 0; font-size: 28px;">Family Forever</h1>
          <p style="margin: 0; font-size: 16px; font-weight: 600;">From Humanity to Community</p>
        </div>
      </div>

      <hr style="margin: 15px 0;" />

      <h2 style="font-size: 18px;"><b>Shift Report</b></h2>

      <div style="display: flex; gap:100px;">
        <div>
          <p style="font-size: 14px;">Date: <b>${shift.dateKey}</b></p>
          <p style="font-size: 14px;">Staff Name: <b>${shift.name}</b></p>
          <p style="font-size: 14px;">Staff ID: <b>${shift.userId}</b></p>
        </div>
        <div>
          <p style="font-size: 14px;">Client Name: <b>${shift.clientName}</b></p>
          <p style="font-size: 14px;">Shift Time: <b>${shift.startTime} - ${shift.endTime}</b></p>
          <p style="font-size: 14px;">Total Hours: <b>${totalHoursCalculated}</b></p>
        </div>
      </div>

      <hr style="margin: 15px 0;" />

      

     <div style="
  margin-top: 15px;
  text-align: justify;
  line-height: 1.55;
  font-size: 14px;
">

  ${shift.shiftReport
    .split(/\n+/)
    .map(
      (p) => `
        <div style="
          margin-bottom: 12px;
          page-break-inside: avoid;
        ">
          ${p}
        </div>
      `
    )
    .join("")}

</div>

    </div>
  `;
};

const buildOpt = (shift) => ({
  margin: 10,
  filename: `Shift_Report_${shift.clientName}.pdf`,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
});

// Apply the centered Family Forever watermark + spacing to every page.
const applyWatermark = (pdf) => {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setLineHeightFactor(1.25); // prevents slicing text across pages

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    /* ⬆ Add top spacing */
    pdf.setFontSize(4);
    pdf.text(" ", 40, 60); // pushes content slightly down

    /* ⬇ Add bottom spacing */
    pdf.text(" ", 40, pageHeight - 60);

    /* Add centered watermark */
    pdf.setGState(pdf.GState({ opacity: 0.15 }));
    pdf.addImage(
      "/images/Logo2.png",
      "PNG",
      pageWidth / 2 - 150,
      pageHeight / 2 - 150,
      300,
      300
    );
    pdf.setGState(pdf.GState({ opacity: 1 }));
  }
};

// Download the watermarked shift report PDF.
export const generateShiftReportPDF = (shift) => {
  html2pdf()
    .from(buildReportContent(shift))
    .set(buildOpt(shift))
    .toPdf()
    .get("pdf")
    .then(applyWatermark)
    .save();
};

// Build the same watermarked PDF and return it as a base64 string (no data-URI
// prefix) — used to email the report as an attachment via the cloud function.
export const getShiftReportPDFBase64 = (shift) => {
  return html2pdf()
    .from(buildReportContent(shift))
    .set(buildOpt(shift))
    .toPdf()
    .get("pdf")
    .then((pdf) => {
      applyWatermark(pdf);
      // 'datauristring' → "data:application/pdf;base64,XXXX"; strip the prefix.
      const dataUri = pdf.output("datauristring");
      return dataUri.substring(dataUri.indexOf(",") + 1);
    });
};
