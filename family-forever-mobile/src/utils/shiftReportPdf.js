import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// Remote green logo (same asset used by the web report) — works in expo-print HTML
const LOGO_URL = "https://ffadmin-prod.web.app/images/Logo2.png";

const calcTotalHours = (start, end) => {
    const s = parseFloat(start);
    const e = parseFloat(end);
    if (isNaN(s) || isNaN(e)) return "N/A";
    if (e >= s) return (e - s).toFixed(2);
    return ((24 - s) + e).toFixed(2);
};

const esc = (v) =>
    String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

/**
 * Build the watermarked shift-report PDF (same layout as the web download)
 * and open the native share / save sheet.
 *
 * shift fields used: dateLabel, staffName, staffId, clientName,
 *   startTime, endTime, reportText
 */
export async function generateShiftReportPdf(shift) {
    const totalHours = calcTotalHours(shift.startTime, shift.endTime);
    const paragraphs = String(shift.reportText || "No shift report has been filed for this shift.")
        .split(/\n+/)
        .map((p) => `<div style="margin-bottom:12px;page-break-inside:avoid;">${esc(p)}</div>`)
        .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 30px 35px; color: #111; position: relative; }
  .watermark {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 320px; opacity: 0.12; z-index: 0;
  }
  .content { position: relative; z-index: 1; }
  .header { display: flex; gap: 20px; align-items: center; }
  h1 { margin: 0; font-size: 26px; }
  hr { margin: 16px 0; border: none; border-top: 1px solid #ddd; }
  .meta { display: flex; gap: 64px; font-size: 14px; }
  .meta p { margin: 4px 0; }
  .report { margin-top: 14px; text-align: justify; line-height: 1.6; font-size: 14px; }
</style>
</head>
<body>
  <img class="watermark" src="${LOGO_URL}" />
  <div class="content">
    <div class="header">
      <img src="${LOGO_URL}" style="width:60px;height:60px;" />
      <div>
        <h1>Family Forever</h1>
        <p style="margin:0;font-size:15px;font-weight:600;">From Humanity to Community</p>
      </div>
    </div>
    <hr />
    <h2 style="font-size:18px;">Shift Report</h2>
    <div class="meta">
      <div>
        <p>Date: <b>${esc(shift.dateLabel)}</b></p>
        <p>Staff Name: <b>${esc(shift.staffName)}</b></p>
        <p>Staff ID: <b>${esc(shift.staffId)}</b></p>
      </div>
      <div>
        <p>Client Name: <b>${esc(shift.clientName)}</b></p>
        <p>Shift Time: <b>${esc(shift.startTime)} - ${esc(shift.endTime)}</b></p>
        <p>Total Hours: <b>${esc(totalHours)}</b></p>
      </div>
    </div>
    <hr />
    <div class="report">${paragraphs}</div>
  </div>
</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Shift Report — ${shift.clientName || "Client"}`,
            UTI: "com.adobe.pdf",
        });
    }
    return uri;
}
