import html2pdf from "html2pdf.js";
import { to12HourClock } from "../utils/timeHelpers";

export const formatTime = (value) => {
  if (!value) return "N/A";
  const s = String(value).trim();

  // Already a formatted "HH:MM AM/PM" string (stored by mobile app) — return as-is
  if (/AM|PM/i.test(s) && s.match(/^\d{1,2}:\d{2}/)) return s.toUpperCase();

  // Bare "HH:mm" / "HH:mm:ss" — no date, so convert the clock value directly
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return to12HourClock(s);

  // "YYYY-MM-DD, HH:mm:ss" — take the time part so the browser timezone
  // never shifts a value that was already recorded in Edmonton local time
  if (s.includes(",")) {
    const timePart = s.split(",")[1]?.trim();
    if (timePart && /^\d{1,2}:\d{2}/.test(timePart)) return to12HourClock(timePart);
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return s || "N/A";

  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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

const buildReportContent = (shift) => {
  // Both default to shown — callers that don't pass these flags (e.g. the
  // quick-download button in the shift list) keep today's full-detail behavior.
  const showShiftTimings = shift.showShiftTimings !== false;
  const showVisitationTiming = shift.showVisitationTiming !== false;

  // Build visitation timing row for supervised visitation shifts
  const category = (shift.categoryName || shift.serviceType || shift.category || "").toLowerCase();
  const isVisitation = category.includes("visitation");
  let visitationHtml = "";
  if (isVisitation && showVisitationTiming) {
    const points = Array.isArray(shift.shiftPoints) ? shift.shiftPoints : [];
    const visitTimes = points
      .filter(p => p.visitStartTime || p.visitEndTime)
      .map(p => `${formatTime(p.visitStartTime)} - ${formatTime(p.visitEndTime)}`)
      .join(", ");
    if (visitTimes) {
      visitationHtml = `<p style="font-size: 13px; margin: 3px 0; color: #333;"><b>Visitation Timing:</b> ${visitTimes}</p>`;
    }
  }

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; padding: 40px 45px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 16px; align-items: center;">
          <img src="/images/Logo2.png" style="width: 65px; height: 65px;" />
          <div>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #2E7D32; letter-spacing: 1px;">FAMILY FOREVER</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: #2E7D32; letter-spacing: 0.5px;">FROM HUMANITY TO COMMUNITY</p>
          </div>
        </div>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #C97B1A;">Daily Shift report</p>
      </div>

      <hr style="margin: 18px 0; border: none; border-top: 1.5px solid #ccc;" />

      <!-- Shift Details -->
      <div style="margin-bottom: 8px;">
        <p style="font-size: 13px; margin: 3px 0; color: #333;"><b>Staff Name:</b> ${shift.name || "N/A"}</p>
        <p style="font-size: 13px; margin: 3px 0; color: #333;"><b>Staff ID:</b> ${shift.staffId || shift.userId || "N/A"}</p>
        <p style="font-size: 13px; margin: 3px 0; color: #333;"><b>Client Name:</b> ${shift.clientName || "N/A"}</p>
        <p style="font-size: 13px; margin: 3px 0; color: #333;"><b>Date:</b> ${shift.dateKey || "N/A"}</p>
        ${showShiftTimings ? `<p style="font-size: 13px; margin: 3px 0; color: #333;"><b>Shift Time:</b> ${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}</p>` : ""}
        ${visitationHtml}
      </div>

      <hr style="margin: 14px 0; border: none; border-top: 1px solid #ddd;" />

      <!-- Report Content -->
      <div style="margin-top: 12px; text-align: justify; line-height: 1.6; font-size: 13px; color: #333;">
        ${(shift.shiftReport || "")
          .split(/\n+/)
          .map(
            (p) => `<div style="margin-bottom: 10px; page-break-inside: avoid;">${p}</div>`
          )
          .join("")}
      </div>
    </div>
  `;
};

const buildOpt = (shift) => ({
  margin: [50, 10, 10, 10],
  filename: `Shift_Report_${shift.clientName}.pdf`,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
});

const applyWatermark = (pdf) => {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Large centered logo watermark
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
      const dataUri = pdf.output("datauristring");
      return dataUri.substring(dataUri.indexOf(",") + 1);
    });
};
