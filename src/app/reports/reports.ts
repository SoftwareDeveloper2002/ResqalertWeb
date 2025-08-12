import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ImageDialogComponent } from './image-dialog.component';
import { FeedbackDialog } from '../feedback-dialog/feedback-dialog';
import { NavbarComponent } from "../shared/navbar/navbar";
import { IncidentDetailsDialog } from './incident-details-dialog.component';
import jsPDF from 'jspdf';
import { firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { handleIncidentPdfRequest, IncidentOffice } from './incident-pdf-actions';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterLink,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    FeedbackDialog,
    NavbarComponent,
    IncidentDetailsDialog,

  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class Reports implements OnInit {
  firebaseData: any[] = [];
  pagedReports: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  role: string = '';
  barangayStats: { barangay: string; count: number }[] = [];
  processedBarangays = new Set<string>();
  barangayCrimeCounts: any = {};

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly dialog: MatDialog
  ) {}

  async ngOnInit(): Promise<void> {
    this.role = localStorage.getItem('role') || 'Unknown';
    const isSA = this.role === 'SA';
    const apiUrl = isSA
      ? `${environment.backendUrl}/api/report/reports`
      : `${environment.backendUrl}/api/report/reports?role=${this.role}`;

    try {
      const rawData = await firstValueFrom(this.http.get<any>(apiUrl));

      console.log('API URL:', apiUrl);
      console.log('API Raw Response:', rawData);

      let dataArray: any[] = Array.isArray(rawData)
        ? rawData
        : Object.keys(rawData || {}).map(key => ({
            id: key,
            ...rawData[key]
          }));

      console.log('Converted Array Data:', dataArray);

      this.firebaseData = dataArray
        .filter(report => {
          if (isSA) return true;
          if (Array.isArray(report.flag)) {
            return report.flag.includes(this.role);
          }
          return report.flag === this.role;
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp || b.createdAt).getTime() -
            new Date(a.timestamp || a.createdAt).getTime()
        );

      console.log('Filtered Data:', this.firebaseData);

      await this.generateBarangayCrimeCounts();
      this.updatePagedReports();

      // Barangay stats calculation
      const counts: Record<string, number> = {};
      for (const report of this.firebaseData) {
        const barangay = report.barangay || 'Unknown';
        counts[barangay] = (counts[barangay] || 0) + 1;
      }

      this.barangayStats = Object.entries(counts)
        .map(([barangay, count]) => ({ barangay, count }))
        .sort((a, b) => b.count - a.count);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  }

  async generateBarangayCrimeCounts(): Promise<void> {
    for (const report of this.firebaseData) {
      const { latitude, longitude } = report;
      const latlngKey = `${latitude},${longitude}`;

      if (!latitude || !longitude || this.processedBarangays.has(latlngKey)) continue;

      try {
        const address: any = await firstValueFrom(
          this.http.get(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        );
        const barangay = this.extractBarangayFromAddress(address);
        report.place = barangay || 'Unknown';
      } catch (e) {
        console.error(`Geocoding failed for ${latlngKey}`, e);
        report.place = 'Unknown';
      }

      this.processedBarangays.add(latlngKey);
      await new Promise(res => setTimeout(res, 150)); // polite delay for Nominatim
    }

    // Rebuild stats after all are processed
    const counts: Record<string, number> = {};
    for (const report of this.firebaseData) {
      const barangay = report.place || 'Unknown';
      counts[barangay] = (counts[barangay] || 0) + 1;
    }
    this.barangayStats = Object.entries(counts)
      .map(([barangay, count]) => ({ barangay, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getAddressFromCoordinates(lat: number, lng: number): Promise<any> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    return this.http.get(url).toPromise();
  }

  extractBarangayFromAddress(addressObj: any): string {
    if (!addressObj || !addressObj.address) return '';
    const addr = addressObj.address;
    return (
      addr.village ||
      addr.neighbourhood ||
      addr.suburb ||
      addr.town ||
      addr.city ||
      addr.municipality ||
      addr.state ||
      ''
    );
  }

  updatePagedReports(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedReports = this.firebaseData.slice(start, end);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedReports();
  }

  openImageDialog(url: string): void {
    this.dialog.open(ImageDialogComponent, {
      data: { imageUrl: url },
      panelClass: 'custom-dialog-container'
    });
  }

  openIncidentDetailsDialog(item: any): void {
    const dialogRef = this.dialog.open(IncidentDetailsDialog, {
      width: '500px',
      data: {
        whoInvolved: item.whoInvolved || '',
        peopleCount: item.peopleCount || 0,
        notes: item.notes || ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        item.whoInvolved = result.whoInvolved;
        item.peopleCount = result.peopleCount;
        item.notes = result.notes;

        const url = `${environment.backendUrl}/api/report/reports/${item.id}`;
        this.http.patch(url, {
          whoInvolved: result.whoInvolved,
          peopleCount: result.peopleCount,
          notes: result.notes
        }).subscribe({
          next: () => console.log('Details saved'),
          error: (err) => console.error('Error saving details', err)
        });
      }
    });
  }

  updateStatus(itemId: string, status: 'Responding' | 'Rescued' | 'Invalid'): void {
    const url = `${environment.backendUrl}/api/report/reports/${itemId}/status`;
    this.http.patch(url, { status }).subscribe({
      next: () => {
        this.firebaseData = this.firebaseData.map(item =>
          item.id === itemId ? { ...item, status } : item
        );
        this.updatePagedReports();
      },
      error: (err) => console.error(`Error updating status for ${itemId}:`, err)
    });
  }

  markAsResponding(itemId: string): void {
    this.updateStatus(itemId, 'Responding');
  }

  markAsRescued(itemId: string): void {
    this.updateStatus(itemId, 'Rescued');
  }

  markAsInvalid(itemId: string): void {
    this.updateStatus(itemId, 'Invalid');
  }

  openFeedbackDialog(): void {
    if (this.role === 'SA') return;

    const dialogRef = this.dialog.open(FeedbackDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.message) {
        const ticket = `#${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8)}`;
        const payload = {
          message: result.message,
          submittedBy: this.role,
          timestamp: new Date().toISOString(),
          ticket: ticket
        };

        this.http.post(
          'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json',
          payload
        ).subscribe(
          () => alert(`✅ Feedback submitted with Ticket ${ticket}`),
          () => alert('❌ Failed to submit feedback')
        );
      }
    });
  }

  // For triggering PDFs
  triggerPdfIncidentToBFP(item: any): void {
    handleIncidentPdfRequest(this.openIncidentPdfDialogReq.bind(this), item, "Bureau of Fire Protection (BFP)");
  }

  triggerPdfIncidentToMDRRMO(item: any): void {
    handleIncidentPdfRequest(this.openIncidentPdfDialogReq.bind(this), item, "Municipal Disaster Risk Reduction and Management Office (MDRRMO)");
  }

  triggerPdfIncidentToPNP(item: any): void {
    handleIncidentPdfRequest(this.openIncidentPdfDialogReq.bind(this), item, "Philippine National Police (PNP)");
  }

  // For accepting PDF requests
  acceptPdfRequestIncidentFromMDRRMO(item: any): void {
    handleIncidentPdfRequest(this.openIncidentPdfDialogReq.bind(this), item, "MDRRMO - Accepted Request");
  }

  acceptPdfRequestIncidentFromBFP(item: any): void {
    handleIncidentPdfRequest(this.openIncidentPdfDialogReq.bind(this), item, "BFP - Accepted Request");
  }

  acceptPdfRequestIncidentFromPNP(item: any): void {
    handleIncidentPdfRequest(this.openIncidentPdfDialogReq.bind(this), item, "PNP - Accepted Request");
  }


  openIncidentPdfDialogReq(item: any, title: IncidentOffice): void {
    if (!item || !title) {
      console.error("Invalid item or title for incident request");
      return;
    }

    // Map IncidentOffice to target role
    const roleMap: Record<IncidentOffice, string> = {
      "Bureau of Fire Protection (BFP)": "BFP",
      "Municipal Disaster Risk Reduction and Management Office (MDRRMO)": "MDRRMO",
      "Philippine National Police (PNP)": "PNP",
      "MDRRMO - Accepted Request": "MDRRMO",
      "BFP - Accepted Request": "BFP",
      "PNP - Accepted Request": "PNP"
    };
    const targetRole = roleMap[title];
    const isAccepted = title.includes("Accepted Request");

    if (isAccepted) {
      console.log(`Directly processing accepted PDF request for ${targetRole}`);
      this.printToPDF(item);
      return;
    }

    console.log(`Sending PDF request to ${targetRole}`);

    const payload = {
      incidentId: item.id,
      title,
      role: targetRole,
      timestamp: new Date().toISOString()
    };

    this.http.post(`${environment.backendUrl}/api/incidents/send-request`, payload).subscribe({
      next: (res: any) => console.log("Incident request sent successfully:", res),
      error: (err: any) => console.error("Error sending incident request:", err)
    });
  }

  // Example helper method
  private generateAndOpenPDF(pdfData: { title: string; content: string; generatedAt: string }) {
    // Convert JSON to blob (placeholder for actual PDF creation)
    const blob = new Blob([JSON.stringify(pdfData, null, 2)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }


  private openIncidentPdfDialog(item: any, departmentLabel: string): void {
  const dialogRef = this.dialog.open(IncidentDetailsDialog, {
    width: '500px',
    data: {
      details: item.details || '',
      whoInvolved: item.whoInvolved || '',
      peopleCount: item.peopleCount || 0,
      notes: item.notes || '',
      departmentLabel
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      item.details = result.details;
      item.whoInvolved = result.whoInvolved;
      item.peopleCount = result.peopleCount;
      item.notes = result.notes;
      item.requestedTo = this.getDepartmentCode(departmentLabel); // store for accept button

      this.printToPDF({ ...item, departmentLabel });

      // Optional: Save request to DB so receiver sees it
      this.saveIncidentRequest(item);
    }
  });
}

  private getDepartmentCode(label: string): string {
    if (label.includes("BFP")) return "BFP";
    if (label.includes("MDRRMO")) return "MDRRMO";
    if (label.includes("PNP")) return "PNP";
    return "";
  }

  private saveIncidentRequest(item: any) {
    fetch(`https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/incidentRequests`, {
      method: 'POST',
      body: JSON.stringify({
        ...item,
        requestedBy: this.role,
        requestedTo: item.requestedTo,
        timestamp: new Date().toISOString()
      })
    });
  }

  triggerPrintToPDF(item: any): void {
    const dialogRef = this.dialog.open(IncidentDetailsDialog, {
      width: '500px',
      data: {
        details: item.details || '',
        whoInvolved: item.whoInvolved || '',
        peopleCount: item.peopleCount || 0,
        notes: item.notes || ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update item with modal input
        item.details = result.details;
        item.whoInvolved = result.whoInvolved;
        item.peopleCount = result.peopleCount;
        item.notes = result.notes;

        this.printToPDF(item); // Proceed to generate PDF
      }
    });
  }

  printToPDF(item: any): void {
    if (!item) {
      alert("No item data found for PDF export.");
      return;
    }

    const doc = new jsPDF();
    const margin = 20;
    const lineSpacing = 8;
    let y = margin;

    const safeText = (value: any): string =>
      value !== undefined && value !== null ? String(value) : 'N/A';

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

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Incident / Accident Report", margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Generated Report", margin, y);
    y += 10;

    drawDivider();

    // Timestamp & Department
    const timestamp = item.timestamp
      ? new Date(item.timestamp).toLocaleString()
      : item.createdAt
        ? new Date(item.createdAt).toLocaleString()
        : "N/A";

    let department = "";

    if (this.role === "PNP") {
      department = "Philippine National Police (PNP)";
    } else if (this.role === "BFP") {
      department = "Bureau of Fire Protection (BFP)";
    } else if (this.role === "MDRRMO") {
      department = "Municipal Disaster Risk Reduction and Management Office (MDRRMO)";
    } else {
      department = "Unknown Department";
    }

    doc.setFontSize(11);

    section("Date/Time", timestamp);
    section("Issuing Department", department);
    section("Place Name", safeText(item.place));
    section("Latitude", item.latitude);
    section("Longitude", item.longitude);
    section("Status", item.status);
    section("Accident Type", item.accident_type);

    drawDivider();

    // People Involved
    doc.setFont("helvetica", "bold");
    doc.text("People Involved", margin, y);
    y += 7;

    section("Who's Involved", item.whoInvolved);
    section("No. of People", item.peopleCount);

    drawDivider();

    // Additional Notes
    doc.setFont("helvetica", "bold");
    doc.text("Additional Notes", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    const notesText = safeText(item.notes || "No notes provided.");
    const splitNotes = doc.splitTextToSize(notesText, 170);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 6;

    drawDivider();

    // Details Section
    doc.setFont("helvetica", "bold");
    doc.text("Incident Details", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    const detailsText = safeText(item.details || "No additional details provided.");
    const splitDetails = doc.splitTextToSize(detailsText, 170);
    doc.text(splitDetails, margin, y);
    y += splitDetails.length * 6;

    // Footer (Optional)
    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("This report was system generated.", margin, y);

    // Save File
    const fileName = `incident-report-${item.id || Date.now()}.pdf`;
    doc.save(fileName);
  }


  logout(): void {
    this.router.navigate(['/login']);
  }

  get totalPages(): number {
    return Math.ceil(this.firebaseData.length / this.itemsPerPage);
  }
}
function openIncidentPdfForAgency(item: any, any: any, agency: any, string: any, status: string, arg5: string) {
  throw new Error('Function not implemented.');
}

