import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportChartAsPNG(chartId: string, filename: string) {
  const el = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement | null;
  if (!el) throw new Error(`Chart "${chartId}" not found`);

  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportDashboardAsPDF(filename = "workforce-report") {
  const mainEl = document.querySelector("main") as HTMLElement | null;
  if (!mainEl) throw new Error("Main content not found");

  const canvas = await html2canvas(mainEl, {
    backgroundColor: "#ffffff",
    scale: 1.5,
    useCORS: true,
    logging: false,
    windowWidth: 1200,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let yOffset = 0;
  const pageHeight = 297; // A4 height in mm

  // Add title
  pdf.setFontSize(16);
  pdf.text("Team Workforce Analytics Report", 14, 15);
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);
  pdf.setTextColor(0);
  yOffset = 28;

  // Paginate the captured image
  const remainingHeight = imgHeight;
  const availableOnFirstPage = pageHeight - yOffset;

  if (remainingHeight <= availableOnFirstPage) {
    pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight);
  } else {
    // Split across pages
    let srcY = 0;
    let firstPage = true;

    while (srcY < canvas.height) {
      const availH = firstPage ? availableOnFirstPage : pageHeight;
      const sliceH = (availH / imgWidth) * canvas.width;
      const actualSlice = Math.min(sliceH, canvas.height - srcY);

      // Create a slice canvas
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = actualSlice;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, srcY, canvas.width, actualSlice, 0, 0, canvas.width, actualSlice);

      const sliceData = sliceCanvas.toDataURL("image/png");
      const sliceImgH = (actualSlice * imgWidth) / canvas.width;

      if (!firstPage) pdf.addPage();
      pdf.addImage(sliceData, "PNG", 0, firstPage ? yOffset : 0, imgWidth, sliceImgH);

      srcY += actualSlice;
      firstPage = false;
    }
  }

  pdf.save(`${filename}.pdf`);
}
