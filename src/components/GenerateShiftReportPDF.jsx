import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const generateShiftReportPDF = async (shiftData) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4
  const { width } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // -------------------- LOAD IMAGES --------------------
  const logoBytes = await fetch("/images/Logo2.png").then((res) =>
    res.arrayBuffer()
  );

  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.40); // ⬅ Bigger logo

  // -------------------- HEADER --------------------
  page.drawImage(logoImage, {
    x: 30,
    y: 775,
    width: logoDims.width,
    height: logoDims.height,
  });

  page.drawText("Family Forever", {
    x: 140,
    y: 805,
    size: 22,
    font: bold,
  });

  page.drawText("From Humanity to Community", {
    x: 140,
    y: 785,
    size: 12,
    font,
  });

  // -------------------- REPORT TITLE --------------------
  page.drawText("Report 1", {
    x: 35,
    y: 740,
    size: 18,
    font: bold,
  });

  // -------------------- DETAILS (Single Row) --------------------
  let y = 710;

  const writeInline = (labelText, valueText) => {
    page.drawText(labelText, {
      x: currentX,
      y,
      size: 11,
      font: bold,
    });

    currentX += bold.widthOfTextAtSize(labelText, 11) + 3;

    page.drawText(valueText, {
      x: currentX,
      y,
      size: 11,
      font,
    });

    currentX += font.widthOfTextAtSize(valueText, 11) + 25; // natural spacing
  };

  let currentX = 35;

  writeInline("Date: ", shiftData.date || "N/A");
  writeInline("Staff Name: ", shiftData.staffName || "N/A");
  writeInline("Staff ID: ", shiftData.staffId || "N/A");
  writeInline("Client Name: ", shiftData.clientName || "N/A");
  writeInline("Client ID: ", shiftData.clientId || "N/A");
  writeInline(
    "Shift Time: ",
    `${shiftData.clockIn || ""} - ${shiftData.clockOut || ""}`
  );

  // -------------------- SHIFT TIMELINE --------------------
  y -= 40;

  page.drawText("Shift Timeline", {
    x: 35,
    y,
    size: 14,
    font: bold,
  });

  y -= 25;
  page.drawText(`Clock In: ${shiftData.clockIn || "N/A"}`, {
    x: 35,
    y,
    size: 11,
    font,
  });

  y -= 20;
  page.drawText(`Clock Out: ${shiftData.clockOut || "N/A"}`, {
    x: 35,
    y,
    size: 11,
    font,
  });

  // -------------------- WATERMARK --------------------
  const watermarkDims = logoImage.scale(1.5);

  page.drawImage(logoImage, {
    x: width / 2 - watermarkDims.width / 2,
    y: 280,
    width: watermarkDims.width,
    height: watermarkDims.height,
    opacity: 0.08,
  });

  // -------------------- LONG SHIFT REPORT (Word Wrapping) --------------------
  const wrapText = (text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let current = "";

    for (const w of words) {
      const test = current + w + " ";
      if (font.widthOfTextAtSize(test, 11) > maxWidth) {
        lines.push(current.trim());
        current = w + " ";
      } else {
        current = test;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  };

  y -= 40;
  const lines = wrapText(shiftData.shiftReport || "", 520);

  for (let line of lines) {
    if (y < 50) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(line, {
      x: 35,
      y,
      size: 11,
      font,
    });
    y -= 15;
  }

  // -------------------- DOWNLOAD PDF --------------------
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Shift_Report_${shiftData.clientName}.pdf`;
  a.click();
};
