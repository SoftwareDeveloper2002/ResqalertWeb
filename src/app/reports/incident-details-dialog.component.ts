import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './incident-details-dialog.component.html',
  styleUrls: ['./incident-details-dialog.component.css']
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
