import html2pdf from "html2pdf.js";

export const downloadIncidentFormPDF = (formRef, values) => {
  if (!formRef?.current) {
    console.error("FORM REF IS NULL");
    return;
  }


  const element = formRef.current;
   const excludeElements = element.querySelectorAll(".pdf-exclude");

  excludeElements.forEach((el) => el.classList.add("pdf-hide"));
  element.classList.add("pdf-safe");

  const children = element.querySelectorAll("*");
  children.forEach(el => el.classList.add("pdf-safe"));

  const opt = {
    margin: 10,
    filename: `Incident_Report_${values?.clientName || "Report"}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
  };

  html2pdf()
    .from(element)
    .set(opt)
    .save();
};
