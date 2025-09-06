// ✅ RequestGetModalComponent updated

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { IncidentDetailsDialog } from '../reports/incident-details-dialog.component';

import jsPDF from 'jspdf';

@Component({
  selector: 'app-request-get-modal',
  templateUrl: './request-get-modal.html',
  styleUrls: ['./request-get-modal.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule
  ],
  providers: [DatePipe]
})
export class RequestGetModalComponent implements OnInit {
  requests: any[] = [];
  role: string;
  displayedColumns: string[] = ['incident_id', 'from_role', 'to_role', 'status', 'action'];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RequestGetModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.role = data?.role || '';
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  close(): void {
    this.dialogRef.close();
  }

  // Load requests and merge with request_data
  loadRequests(): void {
    if (!this.role) return;

    const params = new HttpParams().set('role', this.role);

    this.http.get<any[]>(`${environment.backendUrl}/api/report/requests`, { params })
      .subscribe({
        next: (requestsRes) => {
          console.log('All requests from API:', requestsRes);

          const filtered = requestsRes.filter(req =>
            req.to_role?.toUpperCase() === this.role.toUpperCase() ||
            req.from_role?.toUpperCase() === this.role.toUpperCase()
          );

          this.http.get<any[]>(`${environment.backendUrl}/api/report/request_data`)
            .subscribe({
              next: (requestDataRes) => {
                console.log('All request_data from API:', requestDataRes);

                // ✅ merge by id (not incident_id)
                this.requests = filtered.map(req => {
                  const match = requestDataRes.find(r => r.incident_id === req.incident_id);
                  return match ? { ...req, ...match } : req;
                });

                console.log('Merged requests with request_data:', this.requests);
              },
              error: (err) => {
                console.error('Failed to load request_data', err);
                this.requests = filtered;
              }
            });
        },
        error: (err) => {
          console.error('Failed to load requests', err);
          this.requests = [];
        }
      });
  }

  // ✅ Generate PDF for an approved request
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
      value !== undefined && value !== null && value !== '' ? String(value) : 'N/A';

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
    section("Status", safeText(item.status));
    section("Who's Involved", safeText(item.whoInvolved));
    section("No. of People", safeText(item.peopleCount));
    section("Details", safeText(item.details));
    section("Notes", safeText(item.notes));

    drawDivider();

    // Footer
    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("This report was system generated.", margin, y);

    // Save File
    const fileName = `incident-report-${item.incident_id || Date.now()}.pdf`;
    doc.save(fileName);
  }

  // ✅ Approve request with details (saves into request_data using SAME id + incident_id)
  approveRequestWithDetails(request: any): void {
    const dialogRef = this.dialog.open(IncidentDetailsDialog, {
      width: '800px',
      data: {
        incident_id: request.incident_id,
        mediaUrl: request.mediaUrl || '',
        whoInvolved: request.whoInvolved || '',
        peopleCount: request.peopleCount || 0,
        details: request.details || '',
        notes: request.notes || ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const requestData = {
          id: request.id, // ✅ same Firebase key
          incident_id: request.incident_id, // ✅ keep original incident_id
          from_role: this.role,
          to_role: request.to_role || 'DEFAULT',
          status: 'Approved',
          whoInvolved: result.whoInvolved,
          peopleCount: result.peopleCount,
          details: result.details,
          notes: result.notes,
          timestamp: Date.now()
        };

        console.log('Payload sent to /request_data:', requestData);

        this.http.post(`${environment.backendUrl}/api/report/request_data`, requestData, {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' })
        })
          .subscribe({
            next: (res) => {
              console.log('Approved request saved to request_data:', res);
              this.loadRequests();
            },
            error: (err) => console.error('Failed to save approved request', err)
          });
      }
    });
  }

  // Approve request directly (updates status only in requests collection)
  approveRequest(id: string): void {
    console.log(`Approving request ID: ${id}`);

    this.http.patch(`${environment.backendUrl}/api/report/requests/${id}/approve`, {}, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    })
    .subscribe({
      next: () => {
        this.requests = this.requests.map(req =>
          req.id === id ? { ...req, status: 'Approved' } : req
        );
      },
      error: (err) => console.error('Failed to approve request', err)
    });
  }

  // Decline request (updates status in requests collection)
  declineRequest(id: string): void {
    console.log(`Declining request ID: ${id}`);
    this.http.patch(`${environment.backendUrl}/api/report/requests/${id}/decline`, {}, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    })
      .subscribe({
        next: () => {
          this.requests = this.requests.map(req =>
            req.id === id ? { ...req, status: 'Declined' } : req
          );
        },
        error: (err) => console.error('Failed to decline request', err)
      });
  }
}
