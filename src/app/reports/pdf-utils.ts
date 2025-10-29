// pdf-utils.ts
import jsPDF from 'jspdf';

export function printToPDF(item: any, images: string[] = [], role: string = 'PNP'): void {
  if (!item) {
    alert("No item data found for PDF export.");
    return;
  }

  const doc = new jsPDF();
  const margin = 20;
  const lineSpacing = 8;
  let y = margin;

  const safeText = (value: any, fallback = "N/A"): string =>
    value !== undefined && value !== null && value !== "" ? String(value) : fallback;

  const section = (label: string, value: any, indent = 50) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(safeText(value), margin + indent, y);
    y += lineSpacing;
  };

  const drawDivider = () => {
    doc.setDrawColor(150);
    doc.line(margin, y, 190, y);
    y += 6;
  };

  // HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Incident / Accident Report", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Generated Report", margin, y);
  y += 10;

  drawDivider();

  // Date/Time and Department
  const timestamp = item.timestamp
    ? new Date(item.timestamp).toLocaleString()
    : item.createdAt
    ? new Date(item.createdAt).toLocaleString()
    : "N/A";

  let department = "Unknown Department";
  if (role === "PNP") department = "Philippine National Police (PNP)";
  else if (role === "BFP") department = "Bureau of Fire Protection (BFP)";
  else if (role === "MDRRMO") department = "Municipal Disaster Risk Reduction and Management Office (MDRRMO)";

  section("Date/Time", timestamp);
  section("Issuing Department", department);
  section("Place Name", safeText(item.place));
  section("Latitude", safeText(item.latitude));
  section("Longitude", safeText(item.longitude));
  section("Status", safeText(item.status));
  section(
    "Accident Type",
    Array.isArray(item.accident_type) ? item.accident_type.join(", ") : safeText(item.accident_type)
  );

  drawDivider();

  // PEOPLE INVOLVED
  doc.setFont("helvetica", "bold");
  doc.text("People Involved", margin, y);
  y += 7;

  // Proper fallback logic for Who's Involved
  const whoInvolved =
    item.whoInvolved || item.reportedBy || item.phone_number || item.contact || "N/A";

  let peopleCount: number | string;
  if (item.peopleCount !== undefined && item.peopleCount !== null && item.peopleCount !== "") {
    peopleCount = item.peopleCount;
  } else if (item.numberOfPeople !== undefined && item.numberOfPeople !== null) {
    peopleCount = item.numberOfPeople;
  } else {
    peopleCount = "N/A";
  }

  section("Who's Involved", whoInvolved);
  section("No. of People", peopleCount);

  drawDivider();

  // ADDITIONAL NOTES
  doc.setFont("helvetica", "bold");
  doc.text("Additional Notes", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const notesText = safeText(item.notes, "No notes provided.");
  const splitNotes = doc.splitTextToSize(notesText, 170);
  doc.text(splitNotes, margin, y);
  y += splitNotes.length * 6;

  drawDivider();

  // INCIDENT DETAILS
  doc.setFont("helvetica", "bold");
  doc.text("Incident Details", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const detailsText = safeText(item.details, "No additional details provided.");
  const splitDetails = doc.splitTextToSize(detailsText, 170);
  doc.text(splitDetails, margin, y);
  y += splitDetails.length * 6;

  drawDivider();

  // ATTACHED IMAGES
  if (images?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Attached Images", margin, y);
    y += 7;

    const imgWidth = 50;
    const imgHeight = 50;
    const gap = 10;
    let x = margin;

    for (const img of images) {
      const imgType = img.startsWith("data:image/png") ? "PNG" : "JPEG";
      if (y + imgHeight > 280) {
        doc.addPage();
        y = margin;
        x = margin;
      }
      doc.addImage(img, imgType, x, y, imgWidth, imgHeight);
      x += imgWidth + gap;
      if (x + imgWidth > 190) {
        x = margin;
        y += imgHeight + gap;
      }
    }
    y += imgHeight + gap;
  }

  // FOOTER
  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("This report was system generated.", margin, y);

  doc.save(`incident-report-${item.id || Date.now()}.pdf`);
}
