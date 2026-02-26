import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface IncidentForm {
  incidentId: string;
  fromRole: string;
  toRole: string;
  status: string;
  whoInvolved: string;
  peopleCount: number;
  details: string;
  notes: string;
  latitude: string;
  longitude: string;
}

@Component({
  selector: 'app-incident-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
  <div class="dialog-wrapper">
    <div class="dialog-card">

      <header class="dialog-header">
        <h2>Incident Details</h2>
        <p>Review and export report</p>
      </header>

      <section class="section">
        <h3>People Involved</h3>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Who's Involved</mat-label>
          <input matInput [(ngModel)]="form.whoInvolved"
                 placeholder="John Doe, Jane Smith">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>No. of People</mat-label>
          <input matInput type="number" min="0"
                 [(ngModel)]="form.peopleCount">
        </mat-form-field>
      </section>

      <section class="section">
        <h3>Location</h3>

        <div *ngIf="form.latitude && form.longitude" class="location-box">
          <p><strong>Latitude:</strong> {{ form.latitude }}</p>
          <p><strong>Longitude:</strong> {{ form.longitude }}</p>
          <a [href]="getMapLink()" target="_blank">
            View on Google Maps
          </a>
        </div>
      </section>

      <section class="section">
        <h3>Details</h3>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Details</mat-label>
          <textarea matInput rows="4"
                    [(ngModel)]="form.details"
                    placeholder="Brief description...">
          </textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Additional Notes</mat-label>
          <textarea matInput rows="3"
                    [(ngModel)]="form.notes"
                    placeholder="Any other remarks...">
          </textarea>
        </mat-form-field>
      </section>

      <footer class="dialog-footer">
        <button mat-stroked-button color="warn" (click)="onCancel()">
          <mat-icon>cancel</mat-icon>
          Cancel
        </button>

        <button mat-raised-button color="primary" (click)="onSave()">
          <mat-icon>save</mat-icon>
          Save & Export
        </button>
      </footer>

    </div>
  </div>
  `,
  styles: [`
    .dialog-wrapper {
      padding: 16px;
    }

    .dialog-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 12px 24px rgba(0,0,0,0.08);
      padding: 24px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }

    .dialog-header p {
      margin: 4px 0 16px;
      color: #6b7280;
    }

    .section {
      margin-bottom: 20px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f9fafb;
    }

    .section h3 {
      margin: 0 0 10px;
      font-size: 16px;
      color: #1f2937;
    }

    .full {
      width: 100%;
    }

    .location-box {
      padding: 10px;
      border-radius: 10px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      font-size: 13px;
    }

    .location-box a {
      color: #2563eb;
      text-decoration: underline;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }
  `]
})
export class IncidentDetailsDialog implements OnInit {

  form: IncidentForm = {
    incidentId: '',
    fromRole: 'PNP',
    toRole: 'MDRRMO',
    status: 'Before',
    whoInvolved: '',
    peopleCount: 0,
    details: '',
    notes: '',
    latitude: '',
    longitude: ''
  };

  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<IncidentDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    const entry = this.data?.firebaseData;

    console.log('Dialog Data:', entry);

    if (!entry) {
      console.error('No firebaseData received in dialog.');
      return;
    }

    this.form.incidentId =
      entry.id ||
      entry.incidentId ||
      entry.incident_id ||
      entry.reportId ||
      '';

    this.form.fromRole = entry.from_role || 'PNP';
    this.form.toRole = entry.to_role || 'MDRRMO';
    this.form.status = entry.status || 'Before';

    this.form.whoInvolved = entry.whoInvolved || entry.phone_number || '';
    this.form.peopleCount = Number(entry.peopleCount || 0);

    this.form.details = entry.details || '';
    this.form.notes = entry.notes || '';
    this.form.latitude = entry.latitude || '';
    this.form.longitude = entry.longitude || '';
  }

  getMapLink(): string {
    if (!this.form.latitude || !this.form.longitude) return '';
    return `https://www.google.com/maps?q=${this.form.latitude},${this.form.longitude}`;
  }

  onSave(): void {
    if (!this.form.incidentId) {
      alert('Missing incident ID. Cannot save report.');
      console.error('incidentId is empty:', this.form);
      return;
    }

    const payload = {
      incident_id: this.form.incidentId,
      from_role: this.form.fromRole,
      to_role: this.form.toRole,
      status: this.form.status,
      whoInvolved: this.form.whoInvolved.trim() || 'N/A',
      peopleCount: this.form.peopleCount,
      details: this.form.details.trim() || 'No additional details provided.',
      notes: this.form.notes.trim() || 'No notes provided.',
      latitude: this.form.latitude,
      longitude: this.form.longitude,
      timestamp: Date.now()
    };

    console.log('SENDING TO BACKEND:', payload);

    this.http.post(
      `${environment.backendUrl}/api/report/request_data`,
      payload
    ).subscribe({
      next: (res: any) => {
        console.log('SAVE SUCCESS:', res);

        const pdfUrl =
          `${environment.backendUrl}/api/report/reports/${this.form.incidentId}/pdf`;

        setTimeout(() => {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.target = '_blank';
          link.download = `report-${this.form.incidentId}.pdf`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 800);

        this.dialogRef.close(res);
      },
      error: (err) => {
        console.error('Save Failed:', err);
        alert('Failed to save incident report.');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}